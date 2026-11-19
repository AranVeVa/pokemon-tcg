const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Obtener intercambios del usuario (ofertas enviadas o recibidas)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tradesRes = await db.query(`
      SELECT 
        t.id,
        t.sender_id,
        sender.username AS sender_username,
        t.receiver_id,
        receiver.username AS receiver_username,
        t.offered_user_card_id,
        offered_pc.id AS offered_card_id,
        offered_pc.name AS offered_card_name,
        offered_pc.artwork_url AS offered_card_artwork,
        offered_pc.types AS offered_card_types,
        t.requested_card_id,
        req_pc.name AS requested_card_name,
        req_pc.artwork_url AS requested_card_artwork,
        req_pc.types AS requested_card_types,
        t.status,
        t.created_at,
        t.completed_at,
        (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id = t.sender_id AND uc.card_id = offered_pc.id) AS sender_card_copies,
        (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id = t.sender_id AND uc.card_id = req_pc.id) AS sender_has_requested,
        (SELECT COUNT(*) FROM user_cards uc WHERE uc.user_id = t.receiver_id AND uc.card_id = offered_pc.id) AS receiver_has_offered
      FROM trades t
      JOIN users sender ON t.sender_id = sender.id
      JOIN users receiver ON t.receiver_id = receiver.id
      JOIN user_cards offered_uc ON t.offered_user_card_id = offered_uc.id
      JOIN pokemon_cards offered_pc ON offered_uc.card_id = offered_pc.id
      JOIN pokemon_cards req_pc ON t.requested_card_id = req_pc.id
      WHERE (t.sender_id = $1 OR t.receiver_id = $1)
      ORDER BY t.created_at DESC
    `, [req.user.id]);

    res.json({ trades: tradesRes.rows });
  } catch (error) {
    console.error('Error al obtener intercambios:', error);
    res.status(500).json({ error: 'Error al consultar intercambios' });
  }
});

// Crear nueva propuesta de intercambio
router.post('/create', authenticateToken, async (req, res) => {
  const { receiverId, offeredUserCardId, requestedCardId } = req.body;

  if (!receiverId || !offeredUserCardId || !requestedCardId) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (receiverId === req.user.id) {
    return res.status(400).json({ error: 'No puedes intercambiar cartas contigo mismo' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verificar que el usuario posea la carta ofrecida
    const cardCheck = await client.query(`
      SELECT uc.id, uc.card_id, pc.name 
      FROM user_cards uc 
      JOIN pokemon_cards pc ON uc.card_id = pc.id 
      WHERE uc.id = $1 AND uc.user_id = $2
    `, [offeredUserCardId, req.user.id]);

    if (cardCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No posees la carta ofrecida para intercambiar' });
    }

    // 2. Verificar que el receptor tenga al menos una copia de la carta solicitada
    const receiverCardCheck = await client.query(`
      SELECT id FROM user_cards WHERE user_id = $1 AND card_id = $2 LIMIT 1
    `, [receiverId, requestedCardId]);

    if (receiverCardCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El amigo seleccionado no posee la carta que solicitas' });
    }

    // 3. Crear el intercambio en estado 'pending'
    const newTrade = await client.query(`
      INSERT INTO trades (sender_id, receiver_id, offered_user_card_id, requested_card_id, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [req.user.id, receiverId, offeredUserCardId, requestedCardId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Propuesta de intercambio enviada exitosamente',
      trade: newTrade.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear intercambio:', error);
    res.status(500).json({ error: 'Error al proponer intercambio' });
  } finally {
    client.release();
  }
});

// Confirmar y ejecutar el intercambio en UNA SOLA TRANSACCIÓN ATÓMICA DE POSTGRESQL
router.post('/:id/accept', authenticateToken, async (req, res) => {
  const tradeId = req.params.id;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN'); // Inicio de la transacción ACID

    // 1. Bloquear y verificar el registro de intercambio
    const tradeRes = await client.query(`
      SELECT * FROM trades 
      WHERE id = $1 AND status = 'pending'
      FOR UPDATE
    `, [tradeId]);

    if (tradeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El intercambio no existe o ya fue completado/cancelado' });
    }

    const trade = tradeRes.rows[0];

    // Permitir confirmar al receptor o al emisor en modo demo si está probando
    if (req.user.id !== trade.receiver_id && req.user.id !== trade.sender_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No tienes permiso para confirmar este intercambio' });
    }

    // 2. Verificar que el emisor todavía posea la carta ofrecida
    const senderCardRes = await client.query(`
      SELECT id, card_id FROM user_cards 
      WHERE id = $1 AND user_id = $2
      FOR UPDATE
    `, [trade.offered_user_card_id, trade.sender_id]);

    if (senderCardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El jugador que ofreció la carta ya no la posee' });
    }

    // 3. Buscar una carta elegible del receptor para entregar al emisor
    const receiverCardRes = await client.query(`
      SELECT id, card_id FROM user_cards 
      WHERE user_id = $1 AND card_id = $2
      LIMIT 1
      FOR UPDATE
    `, [trade.receiver_id, trade.requested_card_id]);

    if (receiverCardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El receptor ya no posee la carta solicitada' });
    }

    const receiverUserCardId = receiverCardRes.rows[0].id;

    // 4. Intercambiar la propiedad de ambas cartas atómicamente
    // Carta de Sender pasa a Receiver
    await client.query(`
      UPDATE user_cards 
      SET user_id = $1, is_in_team = false 
      WHERE id = $2
    `, [trade.receiver_id, trade.offered_user_card_id]);

    // Carta de Receiver pasa a Sender
    await client.query(`
      UPDATE user_cards 
      SET user_id = $1, is_in_team = false 
      WHERE id = $2
    `, [trade.sender_id, receiverUserCardId]);

    // 5. Marcar intercambio como 'accepted'
    await client.query(`
      UPDATE trades 
      SET status = 'accepted', completed_at = NOW() 
      WHERE id = $1
    `, [tradeId]);

    // Otorgar experiencia de pase de batalla por intercambio
    await client.query('UPDATE users SET battle_pass_xp = battle_pass_xp + 100 WHERE id IN ($1, $2)', [trade.sender_id, trade.receiver_id]);

    await client.query('COMMIT'); // Commit atómico

    res.json({
      message: '¡Intercambio completado exitosamente en una sola transacción segura!',
      tradeId: trade.id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al aceptar intercambio (transacción revertida):', error);
    res.status(500).json({ error: 'Error al procesar el intercambio de cartas' });
  } finally {
    client.release();
  }
});

// Cancelar o rechazar intercambio
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const tradeId = req.params.id;
  try {
    const result = await db.query(`
      UPDATE trades 
      SET status = 'cancelled', completed_at = NOW() 
      WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2) AND status = 'pending'
      RETURNING id
    `, [tradeId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Intercambio no encontrado o ya procesado' });
    }

    res.json({ message: 'Intercambio cancelado exitosamente' });
  } catch (error) {
    console.error('Error al cancelar intercambio:', error);
    res.status(500).json({ error: 'Error al cancelar intercambio' });
  }
});

module.exports = router;
