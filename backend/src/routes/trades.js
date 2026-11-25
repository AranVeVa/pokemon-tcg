const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Obtener intercambios del usuario (pendientes e historial)
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
        offered_uc.level AS offered_card_level,
        COALESCE(offered_uc.iv_percentage, 85) AS offered_card_iv,
        offered_pc.id AS offered_card_id,
        offered_pc.name AS offered_card_name,
        offered_pc.artwork_url AS offered_card_artwork,
        offered_pc.types AS offered_card_types,
        offered_pc.rarity AS offered_card_rarity,
        t.requested_card_id,
        req_pc.name AS requested_card_name,
        req_pc.artwork_url AS requested_card_artwork,
        req_pc.types AS requested_card_types,
        req_pc.rarity AS requested_card_rarity,
        t.status,
        t.created_at,
        t.completed_at,
        (SELECT COUNT(*)::int FROM user_cards uc WHERE uc.user_id = t.sender_id AND uc.card_id = offered_pc.id) AS sender_card_copies,
        (SELECT COUNT(*)::int FROM user_cards uc WHERE uc.user_id = t.sender_id AND uc.card_id = req_pc.id) AS sender_has_requested,
        (SELECT COUNT(*)::int FROM user_cards uc WHERE uc.user_id = t.receiver_id AND uc.card_id = offered_pc.id) AS receiver_has_offered,
        (SELECT COUNT(*)::int FROM user_cards uc WHERE uc.user_id = t.receiver_id AND uc.card_id = req_pc.id) AS receiver_card_copies
      FROM trades t
      JOIN users sender ON t.sender_id = sender.id
      JOIN users receiver ON t.receiver_id = receiver.id
      JOIN user_cards offered_uc ON t.offered_user_card_id = offered_uc.id
      JOIN pokemon_cards offered_pc ON offered_uc.card_id = offered_pc.id
      JOIN pokemon_cards req_pc ON t.requested_card_id = req_pc.id
      WHERE (t.sender_id = $1 OR t.receiver_id = $1)
      ORDER BY 
        CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
        t.created_at DESC
    `, [req.user.id]);

    res.json({ trades: tradesRes.rows });
  } catch (error) {
    console.error('Error al obtener intercambios:', error);
    res.status(500).json({ error: 'Error al consultar intercambios' });
  }
});

// Consultar cartas disponibles de un amigo aceptado (para saber qué solicitarle)
router.get('/friend-cards/:friendId', authenticateToken, async (req, res) => {
  const friendId = parseInt(req.params.friendId, 10);
  if (!friendId || friendId === req.user.id) {
    return res.status(400).json({ error: 'Amigo no válido' });
  }

  try {
    const friendCheck = await db.query(`
      SELECT id FROM friends 
      WHERE status = 'accepted'
        AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
    `, [req.user.id, friendId]);

    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Solo puedes ver cartas intercambiables de amigos aceptados.' });
    }

    const cardsRes = await db.query(`
      SELECT 
        pc.id AS card_id,
        pc.name,
        pc.types,
        pc.rarity,
        pc.artwork_url,
        pc.sprite_url,
        COUNT(uc.id)::int AS friend_copies,
        MAX(uc.level)::int AS max_level,
        (SELECT COUNT(*)::int FROM user_cards my_uc WHERE my_uc.user_id = $1 AND my_uc.card_id = pc.id) AS my_copies
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $2
      GROUP BY pc.id
      ORDER BY 
        CASE WHEN COUNT(uc.id) > 1 THEN 0 ELSE 1 END,
        CASE WHEN (SELECT COUNT(*) FROM user_cards my_uc WHERE my_uc.user_id = $1 AND my_uc.card_id = pc.id) = 0 THEN 0 ELSE 1 END,
        pc.id ASC
    `, [req.user.id, friendId]);

    res.json({ cards: cardsRes.rows });
  } catch (error) {
    console.error('Error al consultar cartas del amigo:', error);
    res.status(500).json({ error: 'Error al consultar colección del amigo' });
  }
});

// Crear nueva propuesta de intercambio
router.post('/create', authenticateToken, async (req, res) => {
  const { receiverId, offeredUserCardId, requestedCardId } = req.body;

  if (!receiverId || !offeredUserCardId || !requestedCardId) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (parseInt(receiverId, 10) === req.user.id) {
    return res.status(400).json({ error: 'No puedes intercambiar cartas contigo mismo' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verificar amistad aceptada
    const friendCheck = await client.query(`
      SELECT id FROM friends 
      WHERE status = 'accepted'
        AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
    `, [req.user.id, receiverId]);

    if (friendCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo puedes proponer intercambios con amigos aceptados.' });
    }

    // 2. Verificar que el usuario posea la carta ofrecida
    const cardCheck = await client.query(`
      SELECT uc.id, uc.card_id, pc.name 
      FROM user_cards uc 
      JOIN pokemon_cards pc ON uc.card_id = pc.id 
      WHERE uc.id = $1 AND uc.user_id = $2
      FOR UPDATE
    `, [offeredUserCardId, req.user.id]);

    if (cardCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No posees la carta ofrecida para intercambiar' });
    }

    // 3. Evitar doble oferta simultánea de la misma carta física
    const lockedCheck = await client.query(`
      SELECT id FROM trades WHERE offered_user_card_id = $1 AND status = 'pending'
    `, [offeredUserCardId]);

    if (lockedCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Esa copia ya está reservada en otra propuesta de intercambio pendiente.' });
    }

    // 4. Verificar que el receptor tenga al menos una copia de la carta solicitada
    const receiverCardCheck = await client.query(`
      SELECT id FROM user_cards WHERE user_id = $1 AND card_id = $2 LIMIT 1
    `, [receiverId, requestedCardId]);

    if (receiverCardCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El amigo seleccionado no posee la carta que solicitas' });
    }

    // 5. Crear el intercambio en estado 'pending'
    const newTrade = await client.query(`
      INSERT INTO trades (sender_id, receiver_id, offered_user_card_id, requested_card_id, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [req.user.id, receiverId, offeredUserCardId, requestedCardId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Propuesta de intercambio enviada exitosamente. Tu amigo podrá aceptarla o rechazarla.',
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
    await client.query('BEGIN');

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

    // Solo el receptor (quien recibe la propuesta) puede aceptarla
    if (req.user.id !== trade.receiver_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el entrenador que recibió la propuesta puede aceptarla.' });
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

    // 3. Buscar una carta elegible del receptor (preferir copia fuera del equipo y no reservada en otro trade)
    const receiverCardRes = await client.query(`
      SELECT uc.id, uc.card_id FROM user_cards uc
      WHERE uc.user_id = $1 AND uc.card_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM trades t WHERE t.offered_user_card_id = uc.id AND t.status = 'pending'
        )
      ORDER BY uc.is_in_team ASC, uc.level ASC
      LIMIT 1
      FOR UPDATE
    `, [trade.receiver_id, trade.requested_card_id]);

    if (receiverCardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No tienes una copia libre disponible de la carta solicitada.' });
    }

    const receiverUserCardId = receiverCardRes.rows[0].id;

    // 4. Intercambiar propiedad de ambas cartas atómicamente
    await client.query(`
      UPDATE user_cards 
      SET user_id = $1, is_in_team = false 
      WHERE id = $2
    `, [trade.receiver_id, trade.offered_user_card_id]);

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

    // Otorgar XP de pase de batalla por intercambio a ambos
    await client.query('UPDATE users SET battle_pass_xp = battle_pass_xp + 100 WHERE id IN ($1, $2)', [trade.sender_id, trade.receiver_id]);

    await client.query('COMMIT');

    res.json({
      message: '¡Intercambio completado exitosamente (+100 XP para ambos entrenadores)!',
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

// Cancelar (emisor) o rechazar (receptor) intercambio
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const tradeId = req.params.id;
  try {
    const checkRes = await db.query(
      "SELECT id, sender_id, receiver_id FROM trades WHERE id = $1 AND status = 'pending'",
      [tradeId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Intercambio no encontrado o ya procesado' });
    }
    const trade = checkRes.rows[0];
    if (trade.sender_id !== req.user.id && trade.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso sobre este intercambio' });
    }

    const nextStatus = trade.receiver_id === req.user.id ? 'rejected' : 'cancelled';
    await db.query(`
      UPDATE trades 
      SET status = $1, completed_at = NOW() 
      WHERE id = $2
    `, [nextStatus, tradeId]);

    res.json({
      message: nextStatus === 'rejected' ? 'Propuesta rechazada.' : 'Propuesta cancelada exitosamente.'
    });
  } catch (error) {
    console.error('Error al cancelar intercambio:', error);
    res.status(500).json({ error: 'Error al cancelar intercambio' });
  }
});

module.exports = router;
