const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Obtener estado del equipo para combate y mochila de items
router.get('/team', authenticateToken, async (req, res) => {
  try {
    // 1. Obtener Pokémon en el equipo del usuario (o los primeros 3 si no hay marcados)
    let teamRes = await db.query(`
      SELECT 
        uc.id AS user_card_id,
        uc.level,
        uc.current_hp,
        uc.max_hp,
        uc.atk,
        uc.is_in_team,
        pc.id AS card_id,
        pc.name,
        pc.types,
        pc.sprite_url,
        pc.artwork_url,
        CASE 
          WHEN uc.current_hp = 0 THEN 'Debilitado'
          ELSE 'Listo'
        END AS status_text
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1
      ORDER BY uc.is_in_team DESC, uc.level DESC
      LIMIT 3
    `, [req.user.id]);

    // 2. Obtener mochila de items (Mockup 10)
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

    res.json({
      team: teamRes.rows,
      items: itemsRes.rows
    });
  } catch (error) {
    console.error('Error al obtener equipo de combate:', error);
    res.status(500).json({ error: 'Error al consultar equipo de combate' });
  }
});

// Iniciar combate contra un oponente (amigo o entrenador)
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { opponentName = 'Misty_01', battleType = 'normal', opponentCardId = 131 } = req.body;

    // Obtener equipo del usuario
    const userCards = await db.query(`
      SELECT 
        uc.id AS user_card_id,
        uc.level,
        uc.current_hp,
        uc.max_hp,
        uc.atk,
        pc.id AS card_id,
        pc.name,
        pc.types,
        pc.sprite_url,
        pc.artwork_url
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1
      ORDER BY uc.is_in_team DESC, uc.level DESC
      LIMIT 3
    `, [req.user.id]);

    if (userCards.rows.length === 0) {
      return res.status(400).json({ error: 'No tienes Pokémon en tu equipo para combatir' });
    }

    // Si todos están debilitados y es reto normal, avisar que necesita revivirlos
    const readyCards = userCards.rows.filter(c => c.current_hp > 0);
    if (readyCards.length === 0 && battleType === 'normal') {
      return res.status(400).json({ 
        error: 'Todos tus Pokémon están debilitados. Usa revividores en tu mochila antes de entrar a un reto normal.' 
      });
    }

    // Datos del rival (por defecto Lapras o el Pokémon elegido)
    const opponentCardRes = await db.query(`
      SELECT * FROM pokemon_cards WHERE id = $1
    `, [opponentCardId || 131]);
    const opponentCard = opponentCardRes.rows[0] || {
      name: 'Lapras',
      hp_base: 130,
      atk_base: 85,
      types: ['Agua', 'Hielo'],
      artwork_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/131.png'
    };

    const opponentHp = battleType === 'normal' ? 100 : 70;
    const opponentAtk = 40;

    res.json({
      battleId: Date.now(),
      opponentName,
      battleType,
      userTeam: userCards.rows,
      activeUserCard: readyCards[0] || userCards.rows[0],
      opponent: {
        name: opponentCard.name,
        level: battleType === 'normal' ? 14 : 10,
        currentHp: opponentHp,
        maxHp: opponentHp,
        atk: opponentAtk,
        artwork_url: opponentCard.artwork_url,
        sprite_url: opponentCard.sprite_url,
        types: opponentCard.types
      }
    });
  } catch (error) {
    console.error('Error al iniciar combate:', error);
    res.status(500).json({ error: 'Error al iniciar combate' });
  }
});

// Finalizar combate: registrar resultado, experiencia, monedas, items y actualizar HP si es reto normal
router.post('/finish', authenticateToken, async (req, res) => {
  const { battleType, opponentName, result, activeUserCardId, finalUserHp } = req.body;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const isWin = result === 'victoria';
    let xpEarned = 0;
    let coinsEarned = 0;
    let itemDropped = null;

    if (battleType === 'normal') {
      // Reto normal: otorga más XP y posibles items, pero guarda daño/debilitado
      xpEarned = isWin ? 350 : 80;
      coinsEarned = isWin ? 400 : 100;

      // Probabilidad de item al ganar en reto normal
      if (isWin) {
        const itemRoll = Math.random();
        if (itemRoll < 0.40) itemDropped = 'potion_30';
        else if (itemRoll < 0.70) itemDropped = 'revive_10';
        else if (itemRoll < 0.90) itemDropped = 'revive_50';
        else itemDropped = 'heal_full';

        await client.query(`
          INSERT INTO user_items (user_id, item_key, quantity)
          VALUES ($1, $2, 1)
          ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = user_items.quantity + 1
        `, [req.user.id, itemDropped]);
      }

      // En reto normal, guardar la salud resultante (incluyendo si quedó en 0 / debilitado)
      if (activeUserCardId) {
        const hpToSet = Math.max(0, finalUserHp !== undefined ? finalUserHp : (isWin ? 35 : 0));
        await client.query(`
          UPDATE user_cards 
          SET current_hp = $1 
          WHERE id = $2 AND user_id = $3
        `, [hpToSet, activeUserCardId, req.user.id]);
      }
    } else {
      // Reto amistoso: otorga menos XP, sin items y los Pokémon NO quedan fuera de combate (se restauran)
      xpEarned = isWin ? 150 : 40;
      coinsEarned = isWin ? 150 : 50;
      // No se modifica current_hp o se restaura al máximo
      if (activeUserCardId) {
        await client.query(`
          UPDATE user_cards 
          SET current_hp = max_hp 
          WHERE id = $1 AND user_id = $2
        `, [activeUserCardId, req.user.id]);
      }
    }

    // Actualizar usuario: XP de Pase de Batalla y Monedas
    await client.query(`
      UPDATE users 
      SET battle_pass_xp = battle_pass_xp + $1,
          coins = coins + $2
      WHERE id = $3
    `, [xpEarned, coinsEarned, req.user.id]);

    // Registrar en historial de batallas
    await client.query(`
      INSERT INTO battles (user_id, opponent_name, battle_type, result, xp_earned, coins_earned, item_reward)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [req.user.id, opponentName || 'Rival', battleType, result, xpEarned, coinsEarned, itemDropped]);

    const updatedUser = await client.query('SELECT coins, battle_pass_xp, battle_pass_level FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: isWin ? '¡Victoria! Excelente combate.' : 'Derrota. ¡Entrena y vuelve a intentarlo!',
      xpEarned,
      coinsEarned,
      itemDropped,
      userCoins: updatedUser.rows[0].coins,
      battlePassXp: updatedUser.rows[0].battle_pass_xp
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al finalizar combate:', error);
    res.status(500).json({ error: 'Error al registrar fin de combate' });
  } finally {
    client.release();
  }
});

module.exports = router;
