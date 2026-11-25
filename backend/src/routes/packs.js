const express = require('express');
const router = express.Router();
const db = require('../db');
const { INTERVALO_SOBRE_MIN, MODO_DEMO } = require('../config');
const { authenticateToken } = require('../middlewares/auth');
const { generateMovesForPokemon } = require('../data/movesList');
const { DEFAULT_SYSTEM_CONFIGS, ensureCatalogInitialized } = require('../db/ensureCatalog');

async function getSystemPackConfigs(client = db) {
  const cfgRes = await client.query(
    "SELECT key, value FROM system_config WHERE key IN ('pack_rates_normal', 'pack_rates_special', 'pack_rates_legendary', 'item_drop_rates')"
  );
  const map = {};
  cfgRes.rows.forEach(r => {
    map[r.key] = r.value;
  });

  return {
    normal: map.pack_rates_normal || DEFAULT_SYSTEM_CONFIGS.pack_rates_normal,
    especial: map.pack_rates_special || DEFAULT_SYSTEM_CONFIGS.pack_rates_special,
    legendario: map.pack_rates_legendary || DEFAULT_SYSTEM_CONFIGS.pack_rates_legendary,
    itemRates: map.item_drop_rates || DEFAULT_SYSTEM_CONFIGS.item_drop_rates
  };
}

// Obtener estado del sobre gratuito, diario premium, datos de tienda y probabilidades
router.get('/status', authenticateToken, async (req, res) => {
  try {
    await ensureCatalogInitialized();
    const userRes = await db.query(
      'SELECT last_free_pack_claimed_at, last_daily_premium_pack_at, role, coins, gems FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];
    const configs = await getSystemPackConfigs();

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

    let canClaimDailyPremium = false;
    if (user.role === 'Premium' || user.role === 'Admin') {
      if (!user.last_daily_premium_pack_at) {
        canClaimDailyPremium = true;
      } else {
        const lastDaily = new Date(user.last_daily_premium_pack_at);
        const elapsedDaily = Math.floor((now.getTime() - lastDaily.getTime()) / 1000);
        const dailyIntervalSeconds = MODO_DEMO ? 600 : 86400;
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
      userRole: user.role,
      rates: {
        normal: configs.normal,
        especial: configs.especial,
        legendario: configs.legendario
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de sobres:', error);
    res.status(500).json({ error: 'Error al consultar estado de sobres' });
  }
});

// Selección ponderada de cartas considerando rareza y probabilidad de etapa evolucionada por cofre
async function drawCards(count, rates, packType, client = db) {
  const cards = [];

  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    const legRate = Number(rates.legendario || 0);
    const rareRate = Number(rates.rara || 0);
    const uncRate = Number(rates.poco_comun || 0);

    let targetRarity = 'comun';
    if (roll < legRate) {
      targetRarity = 'legendario';
    } else if (roll < legRate + rareRate) {
      targetRarity = 'rara';
    } else if (roll < legRate + rareRate + uncRate) {
      targetRarity = 'poco_comun';
    } else {
      targetRarity = 'comun';
    }

    // Dentro de 'rara', en cofres normales damos menos peso a Etapa 3 que en Especial/Legendario
    let cardRes;
    if (targetRarity === 'rara') {
      const stage3Chance = packType === 'legendario' ? 0.80 : (packType === 'especial' || packType === 'daily_premium') ? 0.72 : 0.45;
      const preferStage3 = Math.random() < stage3Chance;
      cardRes = await client.query(`
        SELECT * FROM pokemon_cards
        WHERE rarity = 'rara' AND ${preferStage3 ? 'evolution_stage = 3' : 'evolution_stage < 3'}
        ORDER BY RANDOM() LIMIT 1
      `);
      if (cardRes.rows.length === 0) {
        cardRes = await client.query(`SELECT * FROM pokemon_cards WHERE rarity = 'rara' ORDER BY RANDOM() LIMIT 1`);
      }
    } else {
      cardRes = await client.query(`
        SELECT * FROM pokemon_cards 
        WHERE rarity = $1 
        ORDER BY RANDOM() LIMIT 1
      `, [targetRarity]);
    }

    if (cardRes.rows.length > 0) {
      cards.push(cardRes.rows[0]);
    } else {
      const anyCard = await client.query('SELECT * FROM pokemon_cards ORDER BY RANDOM() LIMIT 1');
      cards.push(anyCard.rows[0]);
    }
  }

  return cards;
}

// Inserta cartas extraídas en user_cards con stats e IVs
async function insertPulledCards(cards, userId, client) {
  const insertedCards = [];
  for (const card of cards) {
    const moves = generateMovesForPokemon(card.types, card.name);
    const iv = Math.floor(70 + Math.random() * 31);
    const def = Math.round(card.atk_base * 0.85 * (iv / 100));
    const spd = Math.round((card.hp_base + card.atk_base) * 0.5 * (iv / 100));

    const insRes = await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, def, spd, iv_percentage, moves)
      VALUES ($1, $2, 1, $3, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, card.id, card.hp_base, card.atk_base, def, spd, iv, JSON.stringify(moves)]);

    insertedCards.push({
      ...card,
      userCardId: insRes.rows[0].id,
      level: 1,
      def,
      spd,
      iv_percentage: iv,
      moves,
      isEvolvedPull: (card.evolution_stage || 1) > 1
    });
  }
  return insertedCards;
}

const ITEM_DROP_TIERS = {
  gratis:        { rolls: [{ chance: 0.28 }], mult: { comun: 1.5, poco_comun: 0.7, rara: 0.25, legendario: 0.1 } },
  normal:        { rolls: [{ chance: 0.45 }], mult: { comun: 1.3, poco_comun: 1.0, rara: 0.5,  legendario: 0.2 } },
  especial:      { rolls: [{ chance: 0.80 }], mult: { comun: 0.8, poco_comun: 1.2, rara: 2.2,  legendario: 2.5 } },
  daily_premium: { rolls: [{ chance: 0.85 }], mult: { comun: 0.7, poco_comun: 1.2, rara: 2.6,  legendario: 3.0 } },
  legendario:    { rolls: [{ chance: 1.0 }, { chance: 0.40 }], mult: { comun: 0.4, poco_comun: 1.0, rara: 4.0, legendario: 6.0 } }
};

async function rollPackItems(packType, baseRates, client) {
  const tier = ITEM_DROP_TIERS[packType] || ITEM_DROP_TIERS.normal;
  const itemsRes = await client.query('SELECT * FROM items');
  const allItems = itemsRes.rows;
  if (allItems.length === 0) return [];

  const weighted = allItems.map(item => {
    const baseW = Number(baseRates[item.item_key] ?? 0.02);
    const mult = tier.mult[item.rarity] || 1.0;
    return { item, weight: Math.max(0.0001, baseW * mult) };
  });
  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);

  const dropped = [];
  for (const rollCfg of tier.rolls) {
    if (Math.random() <= rollCfg.chance) {
      let r = Math.random() * totalWeight;
      let chosen = weighted[0].item;
      for (const entry of weighted) {
        r -= entry.weight;
        if (r <= 0) {
          chosen = entry.item;
          break;
        }
      }

      await client.query(`
        INSERT INTO user_items (user_id, item_key, quantity)
        VALUES ($1, $2, 1)
        ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = user_items.quantity + 1
      `, [client._currentUserId, chosen.item_key]);

      dropped.push(chosen);
    }
  }

  return dropped;
}

// Abrir sobre gratuito (cada 4 minutos en demo o 4 horas en producción)
router.post('/open-free', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  client._currentUserId = req.user.id;
  try {
    await ensureCatalogInitialized();
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

    const configs = await getSystemPackConfigs(client);
    // Sobre gratuito: mayormente básicos, baja probabilidad de evolucionados
    const rates = { legendario: 0.005, rara: 0.035, poco_comun: 0.12, comun: 0.84 };
    const cards = await drawCards(5, rates, 'gratis', client);
    const insertedCards = await insertPulledCards(cards, req.user.id, client);
    const droppedItems = await rollPackItems('gratis', configs.itemRates, client);

    await client.query(
      'UPDATE users SET last_free_pack_claimed_at = NOW(), battle_pass_xp = battle_pass_xp + 50 WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      message: '¡Sobre gratuito abierto con éxito!',
      cards: insertedCards,
      items: droppedItems,
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
  const { packType, paymentCurrency } = req.body;
  const client = await db.pool.connect();
  client._currentUserId = req.user.id;

  try {
    await ensureCatalogInitialized();
    await client.query('BEGIN');

    const userRes = await client.query('SELECT coins, gems, role FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const user = userRes.rows[0];
    const configs = await getSystemPackConfigs(client);

    let costCoins = 0;
    let costGems = 0;
    let rates = configs.normal;

    if (packType === 'normal') {
      costCoins = 1200;
      rates = configs.normal;
    } else if (packType === 'especial') {
      if (paymentCurrency === 'gems') {
        costGems = 150;
      } else {
        costCoins = 8000;
      }
      rates = configs.especial;
    } else if (packType === 'legendario') {
      costGems = 400;
      rates = configs.legendario;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tipo de sobre inválido' });
    }

    if (user.coins < costCoins) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `PokéMonedas insuficientes. Necesitas ${costCoins.toLocaleString()}.` });
    }

    if (user.gems < costGems) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `PokéGemas insuficientes. Necesitas ${costGems.toLocaleString()}.` });
    }

    await client.query(
      'UPDATE users SET coins = coins - $1, gems = gems - $2 WHERE id = $3',
      [costCoins, costGems, req.user.id]
    );

    let cards = [];
    if (packType === 'legendario') {
      const legRes = await client.query(`
        SELECT * FROM pokemon_cards WHERE rarity = 'legendario' ORDER BY RANDOM() LIMIT 1
      `);
      if (legRes.rows.length > 0) {
        cards.push(legRes.rows[0]);
      }
      const otherCards = await drawCards(4, rates, 'legendario', client);
      cards = cards.concat(otherCards);
    } else {
      cards = await drawCards(5, rates, packType, client);
    }

    const insertedCards = await insertPulledCards(cards, req.user.id, client);
    const droppedItems = await rollPackItems(packType, configs.itemRates, client);

    const xpGained = packType === 'legendario' ? 300 : packType === 'especial' ? 150 : 75;
    await client.query('UPDATE users SET battle_pass_xp = battle_pass_xp + $1 WHERE id = $2', [xpGained, req.user.id]);

    const updatedUser = await client.query('SELECT coins, gems, battle_pass_xp FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡Sobre ${packType.toUpperCase()} abierto exitosamente!`,
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
  client._currentUserId = req.user.id;
  try {
    await ensureCatalogInitialized();
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
        return res.status(400).json({ error: 'Ya reclamaste tu sobre premium de hoy. Vuelve más tarde.' });
      }
    }

    const configs = await getSystemPackConfigs(client);
    const rates = { legendario: 0.10, rara: 0.35, poco_comun: 0.40, comun: 0.15 };
    const cards = await drawCards(5, rates, 'daily_premium', client);
    const insertedCards = await insertPulledCards(cards, req.user.id, client);
    const droppedItems = await rollPackItems('daily_premium', configs.itemRates, client);

    await client.query(
      'UPDATE users SET last_daily_premium_pack_at = NOW() WHERE id = $1',
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      message: '¡Sobre Premium diario reclamado con éxito!',
      cards: insertedCards,
      items: droppedItems
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
