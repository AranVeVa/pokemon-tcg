const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Obtener inventario de items del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const itemsRes = await db.query(`
      SELECT 
        i.item_key,
        i.name,
        i.description,
        i.effect_type,
        i.effect_value,
        i.rarity,
        i.icon,
        COALESCE(ui.quantity, 0) AS quantity
      FROM items i
      LEFT JOIN user_items ui ON i.item_key = ui.item_key AND ui.user_id = $1
      ORDER BY i.item_key ASC
    `, [req.user.id]);

    res.json({ items: itemsRes.rows });
  } catch (error) {
    console.error('Error al obtener inventario de items:', error);
    res.status(500).json({ error: 'Error al consultar items' });
  }
});

// Usar item sobre un Pokémon (curar o revivir)
router.post('/use', authenticateToken, async (req, res) => {
  const { itemKey, userCardId } = req.body;

  if (!itemKey || !userCardId) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (itemKey, userCardId)' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verificar existencia del item y cantidad
    const userItemRes = await client.query(`
      SELECT ui.quantity, i.*
      FROM user_items ui
      JOIN items i ON ui.item_key = i.item_key
      WHERE ui.user_id = $1 AND ui.item_key = $2
      FOR UPDATE
    `, [req.user.id, itemKey]);

    if (userItemRes.rows.length === 0 || userItemRes.rows[0].quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No tienes unidades disponibles de este objeto' });
    }

    const item = userItemRes.rows[0];

    // 2. Obtener carta objetivo
    const cardRes = await client.query(`
      SELECT uc.*, pc.name
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.id = $1 AND uc.user_id = $2
      FOR UPDATE
    `, [userCardId, req.user.id]);

    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pokémon no encontrado en tu equipo' });
    }

    const card = cardRes.rows[0];

    // 3. Validar efecto según estado del Pokémon
    let newHp = card.current_hp;

    if (item.effect_type.startsWith('revive')) {
      if (card.current_hp > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `${card.name} no está debilitado; no necesita un revividor.` });
      }

      if (item.effect_type === 'revive_percent') {
        newHp = Math.max(1, Math.round(card.max_hp * (item.effect_value / 100)));
      } else if (item.effect_type === 'revive_full') {
        newHp = card.max_hp;
      }
    } else if (item.effect_type.startsWith('heal')) {
      if (card.current_hp <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `${card.name} está debilitado. Usa un revividor primero.` });
      }

      if (card.current_hp >= card.max_hp) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `${card.name} ya tiene su salud al máximo.` });
      }

      if (item.effect_type === 'heal_flat') {
        newHp = Math.min(card.max_hp, card.current_hp + item.effect_value);
      } else if (item.effect_type === 'heal_percent') {
        newHp = card.max_hp;
      }
    }

    // 4. Descontar item
    await client.query(`
      UPDATE user_items 
      SET quantity = quantity - 1 
      WHERE user_id = $1 AND item_key = $2
    `, [req.user.id, itemKey]);

    // 5. Actualizar HP de la carta
    const updatedCard = await client.query(`
      UPDATE user_cards 
      SET current_hp = $1 
      WHERE id = $2 
      RETURNING *
    `, [newHp, userCardId]);

    // Consultar cantidad restante del item
    const remainingRes = await client.query(`
      SELECT quantity FROM user_items WHERE user_id = $1 AND item_key = $2
    `, [req.user.id, itemKey]);

    await client.query('COMMIT');

    res.json({
      message: `¡Usaste ${item.name} en ${card.name}! Salud actual: ${newHp}/${card.max_hp} HP.`,
      card: {
        ...updatedCard.rows[0],
        name: card.name
      },
      remainingQuantity: remainingRes.rows[0]?.quantity || 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al usar item:', error);
    res.status(500).json({ error: 'Error al aplicar el objeto' });
  } finally {
    client.release();
  }
});

module.exports = router;
