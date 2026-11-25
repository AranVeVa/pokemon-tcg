const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');
const { ensureCatalogInitialized } = require('../db/ensureCatalog');

// Precios en PokéMonedas para ítems básicos/tácticos en Tienda.
// Los ítems raros/legendarios (Hiperpoción, Cura Total, Revivir Máximo y Prismas Evolutivos)
// son exclusivos de sobres, recompensas y Pase de Batalla.
const SHOP_ITEM_PRICES = {
  potion_30: 150,
  super_potion_75: 350,
  revive_10: 200,
  revive_50: 500,
  energy_boost: 400,
  attack_tonic: 450,
  defense_tonic: 450
};

// Obtener inventario completo de items del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensureCatalogInitialized();
    const itemsRes = await db.query(`
      SELECT 
        i.item_key,
        i.name,
        i.description,
        i.effect_type,
        i.effect_value,
        i.rarity,
        i.icon,
        COALESCE(ui.quantity, 0)::int AS quantity
      FROM items i
      LEFT JOIN user_items ui ON i.item_key = ui.item_key AND ui.user_id = $1
      ORDER BY 
        CASE i.rarity 
          WHEN 'comun' THEN 1 
          WHEN 'poco_comun' THEN 2 
          WHEN 'rara' THEN 3 
          WHEN 'legendario' THEN 4 
          ELSE 5 
        END,
        i.item_key ASC
    `, [req.user.id]);

    const enriched = itemsRes.rows.map(item => ({
      ...item,
      coinPrice: SHOP_ITEM_PRICES[item.item_key] || null,
      isDropOnly: !SHOP_ITEM_PRICES[item.item_key]
    }));

    res.json({ items: enriched });
  } catch (error) {
    console.error('Error al obtener inventario de items:', error);
    res.status(500).json({ error: 'Error al consultar items' });
  }
});

// Comprar ítems básicos o tónicos con PokéMonedas
router.post('/buy', authenticateToken, async (req, res) => {
  const { itemKey, quantity = 1 } = req.body;
  const qty = parseInt(quantity, 10);

  if (!itemKey || !SHOP_ITEM_PRICES[itemKey]) {
    return res.status(400).json({ error: 'Este objeto es exclusivo de sobres y recompensas; no se vende directo por monedas.' });
  }
  if (isNaN(qty) || qty < 1 || qty > 20) {
    return res.status(400).json({ error: 'Cantidad inválida (1 a 20 unidades por compra).' });
  }

  const totalCost = SHOP_ITEM_PRICES[itemKey] * qty;
  const client = await db.pool.connect();

  try {
    await ensureCatalogInitialized();
    await client.query('BEGIN');

    const userRes = await client.query('SELECT coins FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (userRes.rows[0].coins < totalCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `PokéMonedas insuficientes. Necesitas ${totalCost.toLocaleString()} monedas.` });
    }

    const itemRes = await client.query('SELECT name FROM items WHERE item_key = $1', [itemKey]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Objeto no encontrado' });
    }

    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [totalCost, req.user.id]);
    const invRes = await client.query(`
      INSERT INTO user_items (user_id, item_key, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = user_items.quantity + $3
      RETURNING quantity
    `, [req.user.id, itemKey, qty]);

    const updatedUser = await client.query('SELECT coins FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡Compraste ${qty}x ${itemRes.rows[0].name} por ${totalCost.toLocaleString()} PokéMonedas!`,
      userCoins: updatedUser.rows[0].coins,
      newQuantity: invRes.rows[0].quantity
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al comprar item:', error);
    res.status(500).json({ error: 'Error al comprar el objeto' });
  } finally {
    client.release();
  }
});

// Usar item sobre un Pokémon fuera de combate (curar o revivir)
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

    if (item.effect_type.startsWith('evolve')) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Los Prismas Evolutivos se usan en el Laboratorio de Evolución y Mejora.' });
    }

    if (item.effect_type.startsWith('battle_')) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Los tónicos y cargas de energía solo pueden activarse dentro de un combate.' });
    }

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
      return res.status(404).json({ error: 'Pokémon no encontrado en tu colección' });
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
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tipo de objeto no aplicable fuera de combate.' });
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
