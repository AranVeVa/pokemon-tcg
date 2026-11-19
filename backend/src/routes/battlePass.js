const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Consultar estado general del Pase de Batalla
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 1. Obtener temporada actual
    const seasonRes = await db.query("SELECT value FROM system_config WHERE key = 'season_info'");
    const season = seasonRes.rows[0]?.value || { name: 'Temporada Primavera' };

    // 2. Obtener datos del usuario
    const userRes = await db.query(
      'SELECT role, battle_pass_xp, battle_pass_level FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];

    // Cálculo dinámico de nivel según XP (1000 XP por nivel)
    const xpPerLevel = 1500;
    const calculatedLevel = Math.min(50, Math.floor(user.battle_pass_xp / xpPerLevel) + 1);
    const currentXpInLevel = user.battle_pass_xp % xpPerLevel;

    // Actualizar nivel en BD si subió
    if (calculatedLevel !== user.battle_pass_level) {
      await db.query('UPDATE users SET battle_pass_level = $1 WHERE id = $2', [calculatedLevel, req.user.id]);
      user.battle_pass_level = calculatedLevel;
    }

    // 3. Obtener recompensas de los 50 niveles
    const rewardsRes = await db.query('SELECT * FROM battle_pass_rewards ORDER BY level ASC');

    // 4. Obtener reclamos del usuario
    const claimsRes = await db.query(
      'SELECT level, track FROM user_battle_pass_claims WHERE user_id = $1',
      [req.user.id]
    );

    const claimedFree = new Set();
    const claimedPremium = new Set();
    claimsRes.rows.forEach(c => {
      if (c.track === 'free') claimedFree.add(c.level);
      if (c.track === 'premium') claimedPremium.add(c.level);
    });

    const enrichedRewards = rewardsRes.rows.map(r => ({
      level: r.level,
      free: {
        type: r.free_type,
        title: r.free_title,
        value: r.free_value,
        claimed: claimedFree.has(r.level),
        canClaim: user.battle_pass_level >= r.level && !claimedFree.has(r.level)
      },
      premium: {
        type: r.premium_type,
        title: r.premium_title,
        value: r.premium_value,
        claimed: claimedPremium.has(r.level),
        canClaim: (user.role === 'Premium' || user.role === 'Admin') && 
                  user.battle_pass_level >= r.level && 
                  !claimedPremium.has(r.level),
        isLocked: !(user.role === 'Premium' || user.role === 'Admin')
      }
    }));

    res.json({
      seasonName: season.name,
      userLevel: user.battle_pass_level,
      currentXp: currentXpInLevel,
      xpForNextLevel: xpPerLevel,
      totalXp: user.battle_pass_xp,
      userRole: user.role,
      isPremium: user.role === 'Premium' || user.role === 'Admin',
      rewards: enrichedRewards
    });
  } catch (error) {
    console.error('Error al obtener pase de batalla:', error);
    res.status(500).json({ error: 'Error al consultar el pase de batalla' });
  }
});

// Reclamar premio de un nivel y carril ('free' o 'premium')
router.post('/claim', authenticateToken, async (req, res) => {
  const { level, track } = req.body; // track: 'free' | 'premium'

  if (!level || !track || !['free', 'premium'].includes(track)) {
    return res.status(400).json({ error: 'Datos de reclamo inválidos' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT role, battle_pass_level, coins, gems FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const user = userRes.rows[0];

    if (user.battle_pass_level < level) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Aún no alcanzas el nivel ${level} para reclamar este premio.` });
    }

    if (track === 'premium' && user.role !== 'Premium' && user.role !== 'Admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Este carril es exclusivo para usuarios con Pase de Batalla Premium activo.' });
    }

    // Verificar si ya fue reclamado
    const checkClaim = await client.query(
      'SELECT id FROM user_battle_pass_claims WHERE user_id = $1 AND level = $2 AND track = $3',
      [req.user.id, level, track]
    );

    if (checkClaim.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Este premio ya ha sido reclamado.' });
    }

    // Obtener definición del premio
    const rewardRes = await client.query(
      'SELECT * FROM battle_pass_rewards WHERE level = $1',
      [level]
    );

    if (rewardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }

    const reward = rewardRes.rows[0];
    const rewardType = track === 'free' ? reward.free_type : reward.premium_type;
    const rewardValue = track === 'free' ? reward.free_value : reward.premium_value;
    const rewardTitle = track === 'free' ? reward.free_title : reward.premium_title;

    // Entregar recompensa según tipo
    if (rewardValue.coins) {
      await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [rewardValue.coins, req.user.id]);
    }
    if (rewardValue.gems) {
      await client.query('UPDATE users SET gems = gems + $1 WHERE id = $2', [rewardValue.gems, req.user.id]);
    }
    if (rewardValue.packType) {
      // Otorgar cartas de sobre
      const rates = rewardValue.packType === 'especial' 
        ? { legendario: 0.05, rara: 0.25, poco_comun: 0.40, comun: 0.30 }
        : { legendario: 0.01, rara: 0.10, poco_comun: 0.35, comun: 0.54 };
      
      const cardsRes = await client.query('SELECT * FROM pokemon_cards ORDER BY RANDOM() LIMIT 5');
      for (const card of cardsRes.rows) {
        await client.query(`
          INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
          VALUES ($1, $2, 1, $3, $3, $4)
        `, [req.user.id, card.id, card.hp_base, card.atk_base]);
      }
    }
    if (rewardValue.items) {
      for (const itemKey of rewardValue.items) {
        await client.query(`
          INSERT INTO user_items (user_id, item_key, quantity)
          VALUES ($1, $2, 1)
          ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = user_items.quantity + 1
        `, [req.user.id, itemKey]);
      }
    }
    // Si es nivel 50 garantizado (Blastoise EX con estadísticas mejoradas)
    if (rewardType === 'card_guaranteed' && rewardValue.cardId) {
      await client.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, is_in_team)
        VALUES ($1, $2, 5, $3, $3, $4, true)
      `, [req.user.id, rewardValue.cardId, rewardValue.hp || 330, rewardValue.atk || 190]);
    }

    // Registrar reclamo
    await client.query(`
      INSERT INTO user_battle_pass_claims (user_id, level, track)
      VALUES ($1, $2, $3)
    `, [req.user.id, level, track]);

    const updatedUser = await client.query('SELECT coins, gems FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡Recompensa del Nivel ${level} reclamada: ${rewardTitle}!`,
      userCoins: updatedUser.rows[0].coins,
      userGems: updatedUser.rows[0].gems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al reclamar recompensa de pase:', error);
    res.status(500).json({ error: 'Error al reclamar recompensa' });
  } finally {
    client.release();
  }
});

module.exports = router;
