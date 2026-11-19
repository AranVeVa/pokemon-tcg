const express = require('express');
const router = express.Router();
const db = require('../db');
const { INTERVALO_SOBRE_MIN, MODO_DEMO } = require('../config');
const { authenticateToken } = require('../middlewares/auth');

// Obtener estado del sobre gratuito y datos de la tienda
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query(
      'SELECT last_free_pack_claimed_at, last_daily_premium_pack_at, role, coins, gems FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];

    const now = new Date();
    let secondsRemaining = 0;
    let canClaimFree = true;

    if (user.last_free_pack_claimed_at) {
      const lastClaim = new Date(user.last_free_pack_claimed_at);
      const elapsedSeconds = Math.floor((now.getTime() - lastClaim.getTime()) / 1000);
      const intervalSeconds = INTERVALO_SOBRE_MIN * 60;
      
      if (elapsedSeconds < intervalSeconds) {
        secondsRemaining = intervalSeconds - elapsedSeconds;
        canClaimFree = false;
      }
    }

    // Sobre diario premium
    let canClaimDailyPremium = false;
    if (user.role === 'Premium' || user.role === 'Admin') {
      if (!user.last_daily_premium_pack_at) {
        canClaimDailyPremium = true;
      } else {
        const lastDaily = new Date(user.last_daily_premium_pack_at);
        const elapsedDaily = Math.floor((now.getTime() - lastDaily.getTime()) / 1000);
        const dailyIntervalSeconds = MODO_DEMO ? 600 : 86400; // 10 min en demo o 24 hrs
        if (elapsedDaily >= dailyIntervalSeconds) {
          canClaimDailyPremium = true;
        }
      }
    }

    res.json({
      modoDemo: MODO_DEMO,
      intervaloMinutos: INTERVALO_SOBRE_MIN,
      canClaimFree,
      secondsRemaining,
      canClaimDailyPremium,
      userCoins: user.coins,
      userGems: user.gems,
      userRole: user.role
    });
  } catch (error) {
    console.error('Error al obtener estado de sobres:', error);
    res.status(500).json({ error: 'Error al consultar estado de sobres' });
  }
});

// Función auxiliar para seleccionar cartas según rarezas
async function drawCards(count, rates, client = db) {
  const cards = [];
  
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let targetRarity = 'comun';
    
    if (roll < rates.legendario) {
      targetRarity = 'legendario';
    } else if (roll < rates.legendario + rates.rara) {
      targetRarity = 'rara';
    } else if (roll < rates.legendario + rates.rara + rates.poco_comun) {
      targetRarity = 'poco_comun';
    } else {
      targetRarity = 'comun';
    }

    const cardRes = await client.query(`
      SELECT * FROM pokemon_cards 
      WHERE rarity = $1 
      ORDER BY RANDOM() LIMIT 1
    `, [targetRarity]);

    if (cardRes.rows.length > 0) {
      cards.push(cardRes.rows[0]);
    } else {
      // Fallback
      const anyCard = await client.query('SELECT * FROM pokemon_cards ORDER BY RANDOM() LIMIT 1');
      cards.push(anyCard.rows[0]);
    }
  }

  return cards;
}

// Abrir sobre gratuito (cada 4 minutos en demo o 4 horas en producción)
router.post('/open-free', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT last_free_pack_claimed_at FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const user = userRes.rows[0];

    const now = new Date();
    if (user.last_free_pack_claimed_at) {
      const lastClaim = new Date(user.last_free_pack_claimed_at);
      const elapsedSeconds = Math.floor((now.getTime() - lastClaim.getTime()) / 1000);
      const intervalSeconds = INTERVALO_SOBRE_MIN * 60;
      if (elapsedSeconds < intervalSeconds) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Aún no está listo tu sobre gratis. Faltan ${Math.ceil((intervalSeconds - elapsedSeconds) / 60)} minutos.` 
        });
      }
    }

    // Tasas para sobre gratuito (balanceado)
    const rates = { legendario: 0.01, rara: 0.10, poco_comun: 0.35, comun: 0.54 };
    const cards = await drawCards(5, rates, client);

    const insertedCards = [];
    for (const card of cards) {
      const insRes = await client.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
        VALUES ($1, $2, 1, $3, $3, $4)
        RETURNING *
      `, [req.user.id, card.id, card.hp_base, card.atk_base]);
      insertedCards.push({
        ...card,
        userCardId: insRes.rows[0].id,
        level: 1
      });
    }

    // Actualizar fecha de reclamo
    await client.query(
      'UPDATE users SET last_free_pack_claimed_at = NOW() WHERE id = $1',
      [req.user.id]
    );

    // Otorgar pequeña cantidad de XP de pase de batalla
    await client.query(
      'UPDATE users SET battle_pass_xp = battle_pass_xp + 50 WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      message: '¡Sobre gratuito abierto con éxito!',
      cards: insertedCards,
      xpEarned: 50
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al abrir sobre gratis:', error);
    res.status(500).json({ error: 'Error al abrir sobre gratis' });
  } finally {
    client.release();
  }
});

// Comprar y abrir sobre de la tienda
router.post('/buy', authenticateToken, async (req, res) => {
  const { packType, paymentCurrency } = req.body; // packType: 'normal', 'especial', 'legendario'; paymentCurrency: 'coins', 'gems'
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT coins, gems, role FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = userRes.rows[0];

    let costCoins = 0;
    let costGems = 0;
    let rates = { legendario: 0.0, rara: 0.05, poco_comun: 0.25, comun: 0.70 };

    if (packType === 'normal') {
      costCoins = 1200;
      rates = { legendario: 0.00, rara: 0.05, poco_comun: 0.25, comun: 0.70 };
    } else if (packType === 'especial') {
      if (paymentCurrency === 'gems') {
        costGems = 150;
      } else {
        costCoins = 8000;
      }
      rates = { legendario: 0.03, rara: 0.22, poco_comun: 0.40, comun: 0.35 };
    } else if (packType === 'legendario') {
      costGems = 400;
      // Sobre legendario asegura al menos 1 legendario
      rates = { legendario: 0.40, rara: 0.40, poco_comun: 0.20, comun: 0.00 };
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tipo de sobre inválido' });
    }

    if (user.coins < costCoins) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `PokéMonedas insuficientes. Necesitas ${costCoins}.` });
    }

    if (user.gems < costGems) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `PokéGemas insuficientes. Necesitas ${costGems}.` });
    }

    // Descontar saldo
    await client.query(
      'UPDATE users SET coins = coins - $1, gems = gems - $2 WHERE id = $3',
      [costCoins, costGems, req.user.id]
    );

    // Generar 5 cartas
    let cards = [];
    if (packType === 'legendario') {
      // Asegurar 1 legendaria
      const legRes = await client.query(`
        SELECT * FROM pokemon_cards WHERE rarity = 'legendario' ORDER BY RANDOM() LIMIT 1
      `);
      if (legRes.rows.length > 0) {
        cards.push(legRes.rows[0]);
      }
      const otherCards = await drawCards(4, rates, client);
      cards = cards.concat(otherCards);
    } else {
      cards = await drawCards(5, rates, client);
    }

    const insertedCards = [];
    for (const card of cards) {
      const insRes = await client.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
        VALUES ($1, $2, 1, $3, $3, $4)
        RETURNING *
      `, [req.user.id, card.id, card.hp_base, card.atk_base]);
      insertedCards.push({
        ...card,
        userCardId: insRes.rows[0].id,
        level: 1
      });
    }

    // Probabilidad de obtener items en sobres especiales y legendarios
    const droppedItems = [];
    const itemRoll = Math.random();
    if (packType === 'especial' || packType === 'legendario' || itemRoll > 0.4) {
      const possibleItems = ['potion_30', 'revive_10', 'revive_50', 'heal_full'];
      const chosenItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      
      await client.query(`
        INSERT INTO user_items (user_id, item_key, quantity)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = user_items.quantity + 1
      `, [req.user.id, chosenItem]);

      const itemInfo = await client.query('SELECT * FROM items WHERE item_key = $1', [chosenItem]);
      droppedItems.push(itemInfo.rows[0]);
    }

    // Otorgar XP de pase de batalla
    const xpGained = packType === 'legendario' ? 300 : packType === 'especial' ? 150 : 75;
    await client.query('UPDATE users SET battle_pass_xp = battle_pass_xp + $1 WHERE id = $2', [xpGained, req.user.id]);

    const updatedUser = await client.query('SELECT coins, gems, battle_pass_xp FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡${packType.toUpperCase()} abierto exitosamente!`,
      cards: insertedCards,
      items: droppedItems,
      xpGained,
      userCoins: updatedUser.rows[0].coins,
      userGems: updatedUser.rows[0].gems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al comprar sobre:', error);
    res.status(500).json({ error: 'Error al comprar sobre' });
  } finally {
    client.release();
  }
});

// Canjear PokéGemas por PokéMonedas (100 gemas = 5,000 monedas)
router.post('/exchange-gems', authenticateToken, async (req, res) => {
  const { gemsToExchange = 100 } = req.body;
  if (gemsToExchange <= 0 || gemsToExchange % 100 !== 0) {
    return res.status(400).json({ error: 'El canje debe ser en múltiplos de 100 gemas' });
  }

  const coinsToReceive = (gemsToExchange / 100) * 5000;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT gems FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (userRes.rows[0].gems < gemsToExchange) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No tienes suficientes PokéGemas' });
    }

    await client.query(`
      UPDATE users 
      SET gems = gems - $1, coins = coins + $2 
      WHERE id = $3
    `, [gemsToExchange, coinsToReceive, req.user.id]);

    const updatedUser = await client.query('SELECT coins, gems FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡Canje exitoso! Recibiste ${coinsToReceive.toLocaleString()} PokéMonedas.`,
      userCoins: updatedUser.rows[0].coins,
      userGems: updatedUser.rows[0].gems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en canje de gemas:', error);
    res.status(500).json({ error: 'Error al procesar el canje' });
  } finally {
    client.release();
  }
});

// Reclamar sobre diario premium
router.post('/claim-daily-premium', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Premium' && req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Solo disponible para usuarios Premium' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT last_daily_premium_pack_at FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );

    const now = new Date();
    if (userRes.rows[0].last_daily_premium_pack_at) {
      const last = new Date(userRes.rows[0].last_daily_premium_pack_at);
      const diffSec = (now.getTime() - last.getTime()) / 1000;
      const minSec = MODO_DEMO ? 600 : 86400;
      if (diffSec < minSec) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ya reclamaste tu sobre premium de hoy. Vuelve mañana.' });
      }
    }

    // Sobre especial con mejores probabilidades
    const rates = { legendario: 0.10, rara: 0.35, poco_comun: 0.40, comun: 0.15 };
    const cards = await drawCards(5, rates, client);

    const insertedCards = [];
    for (const card of cards) {
      const insRes = await client.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
        VALUES ($1, $2, 1, $3, $3, $4)
        RETURNING *
      `, [req.user.id, card.id, card.hp_base, card.atk_base]);
      insertedCards.push({
        ...card,
        userCardId: insRes.rows[0].id,
        level: 1
      });
    }

    await client.query(
      'UPDATE users SET last_daily_premium_pack_at = NOW() WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      message: '¡Sobre Premium diario reclamado con éxito!',
      cards: insertedCards
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al reclamar sobre premium diario:', error);
    res.status(500).json({ error: 'Error al reclamar sobre premium' });
  } finally {
    client.release();
  }
});

module.exports = router;
