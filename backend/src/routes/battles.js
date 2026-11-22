const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');
const { generateMovesForPokemon, getEffectivenessMultiplier } = require('../data/movesList');

// Helper para URLs de sprites animados oficiales de PokéAPI (Showdown & Gen 5)
function getAnimatedSprites(pokemonId) {
  return {
    front: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`,
    back: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${pokemonId}.gif`,
    fallbackFront: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`,
    fallbackBack: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/${pokemonId}.gif`,
    artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
  };
}

// Obtener estado del equipo para combate (3 Pokémon) y mochila de items
router.get('/team', authenticateToken, async (req, res) => {
  try {
    // 1. Obtener los Pokémon marcados en el equipo de 3
    let teamRes = await db.query(`
      SELECT 
        uc.id AS user_card_id,
        uc.level,
        uc.current_hp,
        uc.max_hp,
        uc.atk,
        COALESCE(uc.def, 50) AS def,
        COALESCE(uc.spd, 50) AS spd,
        COALESCE(uc.iv_percentage, 85) AS iv_percentage,
        uc.moves,
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
      WHERE uc.user_id = $1 AND uc.is_in_team = true
      ORDER BY uc.level DESC
      LIMIT 3
    `, [req.user.id]);

    // Si no tiene 3 marcados, autocompletar con los mejores de su colección
    if (teamRes.rows.length < 3) {
      const fallbackRes = await db.query(`
        SELECT 
          uc.id AS user_card_id,
          uc.level,
          uc.current_hp,
          uc.max_hp,
          uc.atk,
          COALESCE(uc.def, 50) AS def,
          COALESCE(uc.spd, 50) AS spd,
          COALESCE(uc.iv_percentage, 85) AS iv_percentage,
          uc.moves,
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

      teamRes = fallbackRes;

      // Marcar estos 3 en el equipo
      if (teamRes.rows.length > 0) {
        const ids = teamRes.rows.map(r => r.user_card_id);
        await db.query(`
          UPDATE user_cards SET is_in_team = (id = ANY($1::int[])) WHERE user_id = $2
        `, [ids, req.user.id]);
      }
    }

    const enrichedTeam = teamRes.rows.map(card => {
      const animated = getAnimatedSprites(card.card_id);
      let moves = card.moves;
      if (!moves || !Array.isArray(moves) || moves.length === 0) {
        moves = generateMovesForPokemon(card.types, card.name);
      }
      return {
        ...card,
        moves,
        animated_front_url: animated.front,
        animated_back_url: animated.back
      };
    });

    // Mochila de items
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
      team: enrichedTeam,
      items: itemsRes.rows
    });
  } catch (error) {
    console.error('Error al obtener equipo de combate:', error);
    res.status(500).json({ error: 'Error al consultar equipo de combate' });
  }
});

// Configurar los 3 Pokémon del equipo de combate
router.post('/set-team', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { teamCardIds } = req.body;
    if (!Array.isArray(teamCardIds) || teamCardIds.length === 0 || teamCardIds.length > 3) {
      return res.status(400).json({ error: 'Debes seleccionar exactamente entre 1 y 3 Pokémon para tu equipo' });
    }

    await client.query('BEGIN');

    // 1. Quitar todos los Pokémon del equipo del usuario
    await client.query('UPDATE user_cards SET is_in_team = false WHERE user_id = $1', [req.user.id]);

    // 2. Establecer los seleccionados como is_in_team = true
    await client.query(`
      UPDATE user_cards 
      SET is_in_team = true 
      WHERE id = ANY($1::int[]) AND user_id = $2
    `, [teamCardIds, req.user.id]);

    await client.query('COMMIT');

    // 3. Devolver el equipo actualizado
    const updatedTeamRes = await client.query(`
      SELECT 
        uc.id AS user_card_id,
        uc.level,
        uc.current_hp,
        uc.max_hp,
        uc.atk,
        COALESCE(uc.def, 50) AS def,
        COALESCE(uc.spd, 50) AS spd,
        COALESCE(uc.iv_percentage, 85) AS iv_percentage,
        uc.moves,
        uc.is_in_team,
        pc.id AS card_id,
        pc.name,
        pc.types,
        pc.sprite_url,
        pc.artwork_url
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1 AND uc.is_in_team = true
      ORDER BY uc.level DESC
    `, [req.user.id]);

    const enriched = updatedTeamRes.rows.map(card => {
      const animated = getAnimatedSprites(card.card_id);
      let moves = card.moves;
      if (!moves || !Array.isArray(moves) || moves.length === 0) {
        moves = generateMovesForPokemon(card.types, card.name);
      }
      return {
        ...card,
        moves,
        animated_front_url: animated.front,
        animated_back_url: animated.back
      };
    });

    res.json({
      success: true,
      message: 'Equipo de 3 Pokémon actualizado exitosamente',
      team: enriched
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al configurar equipo:', error);
    res.status(500).json({ error: 'Error al guardar equipo de combate' });
  } finally {
    client.release();
  }
});

// Iniciar combate contra un oponente
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { 
      opponentName = 'Misty_01', 
      battleType = 'normal', 
      opponentCardId = 131,
      selectedUserCardId
    } = req.body;

    // Obtener equipo de 3 del usuario
    let userCards = await db.query(`
      SELECT 
        uc.id AS user_card_id,
        uc.level,
        uc.current_hp,
        uc.max_hp,
        uc.atk,
        COALESCE(uc.def, 50) AS def,
        COALESCE(uc.spd, 50) AS spd,
        COALESCE(uc.iv_percentage, 85) AS iv_percentage,
        uc.moves,
        pc.id AS card_id,
        pc.name,
        pc.types,
        pc.sprite_url,
        pc.artwork_url
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1 AND uc.is_in_team = true
      ORDER BY uc.level DESC
      LIMIT 3
    `, [req.user.id]);

    if (userCards.rows.length === 0) {
      userCards = await db.query(`
        SELECT 
          uc.id AS user_card_id,
          uc.level,
          uc.current_hp,
          uc.max_hp,
          uc.atk,
          COALESCE(uc.def, 50) AS def,
          COALESCE(uc.spd, 50) AS spd,
          COALESCE(uc.iv_percentage, 85) AS iv_percentage,
          uc.moves,
          pc.id AS card_id,
          pc.name,
          pc.types,
          pc.sprite_url,
          pc.artwork_url
        FROM user_cards uc
        JOIN pokemon_cards pc ON uc.card_id = pc.id
        WHERE uc.user_id = $1
        ORDER BY uc.level DESC
        LIMIT 3
      `, [req.user.id]);
    }

    if (userCards.rows.length === 0) {
      return res.status(400).json({ error: 'No tienes cartas en tu colección para combatir' });
    }

    // En combate amistoso, restaurar vida completa a los 3 Pokémon del equipo
    if (battleType === 'amistoso') {
      userCards.rows.forEach(c => {
        c.current_hp = c.max_hp;
      });
    }

    const readyCards = userCards.rows.filter(c => c.current_hp > 0);
    if (readyCards.length === 0 && battleType === 'normal') {
      return res.status(400).json({ 
        error: 'Todos los Pokémon de tu equipo están debilitados. Usa revividores en tu mochila antes de entrar a un reto normal.' 
      });
    }

    // Carta activa elegida o la primera lista
    let activeCard = userCards.rows[0];
    if (selectedUserCardId) {
      const chosen = userCards.rows.find(c => c.user_card_id === parseInt(selectedUserCardId));
      if (chosen) activeCard = chosen;
    } else if (readyCards.length > 0) {
      activeCard = readyCards[0];
    }

    // Asegurar que activeCard tenga movimientos
    if (!activeCard.moves || !Array.isArray(activeCard.moves) || activeCard.moves.length === 0) {
      activeCard.moves = generateMovesForPokemon(activeCard.types, activeCard.name);
    }
    const userAnimated = getAnimatedSprites(activeCard.card_id);
    activeCard.animated_front_url = userAnimated.front;
    activeCard.animated_back_url = userAnimated.back;

    // Datos del rival
    const opponentCardRes = await db.query(`
      SELECT * FROM pokemon_cards WHERE id = $1
    `, [opponentCardId || 131]);
    const opponentCard = opponentCardRes.rows[0] || {
      id: 131,
      name: 'Lapras',
      hp_base: 130,
      atk_base: 85,
      types: ['Agua', 'Hielo'],
      artwork_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/131.png'
    };

    const oppLevel = battleType === 'normal' ? 14 : 10;
    const oppMaxHp = Math.round(opponentCard.hp_base * (1 + (oppLevel - 1) * 0.15));
    const oppAtk = Math.round(opponentCard.atk_base * (1 + (oppLevel - 1) * 0.15));
    const oppDef = Math.round(oppAtk * 0.8);
    const oppSpd = Math.round((opponentCard.hp_base + oppAtk) * 0.45);
    const oppMoves = generateMovesForPokemon(opponentCard.types, opponentCard.name);
    const oppAnimated = getAnimatedSprites(opponentCard.id);

    const enrichedUserTeam = userCards.rows.map(c => {
      const anim = getAnimatedSprites(c.card_id);
      return {
        ...c,
        moves: c.moves || generateMovesForPokemon(c.types, c.name),
        animated_front_url: anim.front,
        animated_back_url: anim.back
      };
    });

    res.json({
      battleId: Date.now(),
      opponentName,
      battleType,
      userTeam: enrichedUserTeam,
      activeUserCard: activeCard,
      opponent: {
        id: opponentCard.id,
        name: opponentCard.name,
        level: oppLevel,
        currentHp: oppMaxHp,
        maxHp: oppMaxHp,
        atk: oppAtk,
        def: oppDef,
        spd: oppSpd,
        types: opponentCard.types,
        moves: oppMoves,
        artwork_url: opponentCard.artwork_url,
        animated_front_url: oppAnimated.front,
        animated_back_url: oppAnimated.back
      }
    });
  } catch (error) {
    console.error('Error al iniciar combate:', error);
    res.status(500).json({ error: 'Error al iniciar combate' });
  }
});

// Finalizar combate
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
      // Reto normal: mayor recompensa, daño persiste
      xpEarned = isWin ? 350 : 90;
      coinsEarned = isWin ? 400 : 100;

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

      if (activeUserCardId) {
        const hpToSet = Math.max(0, finalUserHp !== undefined ? finalUserHp : (isWin ? 35 : 0));
        await client.query(`
          UPDATE user_cards 
          SET current_hp = $1 
          WHERE id = $2 AND user_id = $3
        `, [hpToSet, activeUserCardId, req.user.id]);
      }
    } else {
      // Reto amistoso: sparring amigable, los Pokémon se restauran al 100%
      xpEarned = isWin ? 180 : 60;
      coinsEarned = isWin ? 200 : 60;

      if (activeUserCardId) {
        await client.query(`
          UPDATE user_cards 
          SET current_hp = max_hp 
          WHERE id = $1 AND user_id = $2
        `, [activeUserCardId, req.user.id]);
      }
    }

    // Actualizar usuario
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
      message: isWin ? '¡Victoria Magistral! Gran estrategia en combate.' : 'Derrota. ¡Entrena y mejora tus ataques!',
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
