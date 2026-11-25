const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');
const { generateMovesForPokemon, getEffectivenessMultiplier } = require('../data/movesList');

const FRIENDLY_FIXED_LEVEL = 5;

let liveTableChecked = false;
async function ensureLiveBattlesTable() {
  if (liveTableChecked) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS live_battles (
        id SERIAL PRIMARY KEY,
        challenger_id INT REFERENCES users(id) ON DELETE CASCADE,
        opponent_id INT REFERENCES users(id) ON DELETE CASCADE,
        battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('amistoso', 'normal')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished', 'rejected', 'cancelled')),
        turn_user_id INT,
        turn_number INT DEFAULT 1,
        winner_id INT,
        challenger_team JSONB NOT NULL,
        opponent_team JSONB,
        challenger_active_idx INT DEFAULT 0,
        opponent_active_idx INT DEFAULT 0,
        challenger_energy INT DEFAULT 20,
        opponent_energy INT DEFAULT 20,
        challenger_shield BOOLEAN DEFAULT FALSE,
        opponent_shield BOOLEAN DEFAULT FALSE,
        challenger_atk_buff NUMERIC(4,2) DEFAULT 1.0,
        opponent_atk_buff NUMERIC(4,2) DEFAULT 1.0,
        challenger_def_buff NUMERIC(4,2) DEFAULT 1.0,
        opponent_def_buff NUMERIC(4,2) DEFAULT 1.0,
        must_switch_user_id INT,
        last_event JSONB,
        rewards JSONB,
        battle_logs JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    liveTableChecked = true;
  } catch (err) {
    console.warn('Aviso al verificar tabla live_battles:', err.message);
  }
}

function getAnimatedSprites(pokemonId) {
  return {
    front: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokemonId}.gif`,
    back: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${pokemonId}.gif`,
    artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
  };
}

function ensureFourMoves(existingMoves, types, name) {
  const generated = generateMovesForPokemon(types, name);
  if (!Array.isArray(existingMoves) || existingMoves.length === 0) return generated;
  if (existingMoves.length >= 4) return existingMoves;
  return [
    existingMoves[0] || generated[0],
    existingMoves[1] || generated[1],
    existingMoves[2] || generated[2],
    existingMoves[3] || generated[3]
  ];
}

// Construye la instantánea del equipo de 3 Pokémon de un jugador real desde la BD
async function buildPlayerTeamSnapshot(clientOrDb, userId, battleType, leadUserCardId = null) {
  let teamRes = await clientOrDb.query(`
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
      pc.hp_base,
      pc.atk_base,
      pc.sprite_url,
      pc.artwork_url
    FROM user_cards uc
    JOIN pokemon_cards pc ON uc.card_id = pc.id
    WHERE uc.user_id = $1 AND uc.is_in_team = true
    ORDER BY uc.level DESC
    LIMIT 3
  `, [userId]);

  if (teamRes.rows.length < 3) {
    const fallbackRes = await clientOrDb.query(`
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
        pc.hp_base,
        pc.atk_base,
        pc.sprite_url,
        pc.artwork_url
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1
      ORDER BY uc.is_in_team DESC, uc.level DESC
      LIMIT 3
    `, [userId]);
    teamRes = fallbackRes;
  }

  let rows = teamRes.rows.map(card => {
    const anim = getAnimatedSprites(card.card_id);
    const iv = card.iv_percentage || 85;
    let level = card.level || 1;
    let maxHp = card.max_hp || 100;
    let currentHp = card.current_hp !== undefined ? card.current_hp : maxHp;
    let atk = card.atk || 60;
    let def = card.def || 50;
    let spd = card.spd || 50;

    // En combate amistoso se igualan todos los Pokémon al nivel predeterminado (Nivel 5)
    if (battleType === 'amistoso') {
      level = FRIENDLY_FIXED_LEVEL;
      const scaleFactor = 1 + (FRIENDLY_FIXED_LEVEL - 1) * 0.25; // 2.0x para Nivel 5
      const ivFactor = 0.92 + (iv / 1000);
      maxHp = Math.round((card.hp_base || 60) * scaleFactor * ivFactor);
      atk = Math.round((card.atk_base || 55) * scaleFactor * ivFactor);
      def = Math.round(atk * 0.85);
      spd = Math.round(((card.hp_base || 60) + (card.atk_base || 55)) * 0.55 * ivFactor);
      currentHp = maxHp;
    }

    return {
      user_card_id: card.user_card_id,
      card_id: card.card_id,
      name: card.name,
      types: card.types || ['Normal'],
      level,
      current_hp: currentHp,
      max_hp: maxHp,
      atk,
      def,
      spd,
      iv_percentage: iv,
      moves: ensureFourMoves(card.moves, card.types, card.name),
      artwork_url: card.artwork_url,
      sprite_url: card.sprite_url,
      animated_front_url: anim.front,
      animated_back_url: anim.back
    };
  });

  // Colocar al Pokémon líder seleccionado (si está vivo) en la posición 0
  if (leadUserCardId) {
    const leadIdx = rows.findIndex(c => c.user_card_id === parseInt(leadUserCardId, 10) && c.current_hp > 0);
    if (leadIdx > 0) {
      const [lead] = rows.splice(leadIdx, 1);
      rows.unshift(lead);
    }
  } else {
    // Asegurar que la posición 0 tenga vida > 0 si hay alguno vivo
    const aliveIdx = rows.findIndex(c => c.current_hp > 0);
    if (aliveIdx > 0) {
      const [alive] = rows.splice(aliveIdx, 1);
      rows.unshift(alive);
    }
  }

  return rows;
}

// Formatea el estado de batalla desde la perspectiva del jugador que consulta
function formatBattleViewForUser(battle, viewerId, challengerUsername, opponentUsername) {
  const isChallenger = battle.challenger_id === viewerId;
  const myTeam = isChallenger ? battle.challenger_team : (battle.opponent_team || []);
  const oppTeam = isChallenger ? (battle.opponent_team || []) : battle.challenger_team;
  const myActiveIdx = isChallenger ? battle.challenger_active_idx : battle.opponent_active_idx;
  const oppActiveIdx = isChallenger ? battle.opponent_active_idx : battle.challenger_active_idx;

  return {
    id: battle.id,
    battleType: battle.battle_type,
    status: battle.status,
    turnNumber: battle.turn_number,
    turnUserId: battle.turn_user_id,
    isMyTurn: battle.status === 'active' && battle.turn_user_id === viewerId,
    mustISwitch: battle.status === 'active' && battle.must_switch_user_id === viewerId,
    oppMustSwitch: battle.status === 'active' && battle.must_switch_user_id && battle.must_switch_user_id !== viewerId,
    winnerId: battle.winner_id,
    didIWin: battle.status === 'finished' ? battle.winner_id === viewerId : null,
    isChallenger,
    myName: isChallenger ? challengerUsername : opponentUsername,
    opponentName: isChallenger ? opponentUsername : challengerUsername,
    challengerId: battle.challenger_id,
    opponentId: battle.opponent_id,
    myTeam,
    oppTeam,
    myActiveIdx,
    oppActiveIdx,
    myEnergy: isChallenger ? battle.challenger_energy : battle.opponent_energy,
    oppEnergy: isChallenger ? battle.opponent_energy : battle.challenger_energy,
    myShield: isChallenger ? battle.challenger_shield : battle.opponent_shield,
    oppShield: isChallenger ? battle.opponent_shield : battle.challenger_shield,
    myAtkBuff: parseFloat(isChallenger ? battle.challenger_atk_buff : battle.opponent_atk_buff),
    myDefBuff: parseFloat(isChallenger ? battle.challenger_def_buff : battle.opponent_def_buff),
    lastEvent: battle.last_event,
    rewards: battle.rewards ? (isChallenger ? battle.rewards.challenger : battle.rewards.opponent) : null,
    battleLogs: battle.battle_logs || []
  };
}

function calculatePvpDamage(attacker, defender, move, atkBuff = 1.0, defBuff = 1.0, hasShield = false) {
  const mult = getEffectivenessMultiplier(move.type, defender.types || []);
  const hasStab = (attacker.types || []).includes(move.type);
  const stabBonus = hasStab ? 1.25 : 1.0;

  const baseCritRate = (attacker.spd || 50) / 280;
  const extraCrit = move.critBonus || 0;
  const isCrit = Math.random() < Math.min(0.60, baseCritRate + extraCrit);
  const critMult = isCrit ? 1.55 : 1.0;

  const effectiveAtk = (attacker.atk || 50) * atkBuff;
  const effectiveDef = Math.max(15, (defender.def || 45) * defBuff * (hasShield ? 4.0 : 1.0));
  const baseDamage = ((effectiveAtk * (move.power || 20)) / (effectiveDef * 1.35)) * mult * stabBonus * critMult;
  const damage = Math.max(4, Math.round(baseDamage + Math.random() * 4));

  let effectivenessText = '';
  if (mult >= 1.5) effectivenessText = '¡Súper eficaz!';
  else if (mult <= 0.7) effectivenessText = 'Poco eficaz...';
  if (isCrit) effectivenessText += ' ¡Crítico!';
  if (hasShield) effectivenessText += ' [Escudo -75%]';

  return { damage, mult, isCrit, effectivenessText: effectivenessText.trim() };
}

async function finalizeLiveBattle(client, battle, winnerId, loserId, battleType, cTeam, oTeam, logs) {
  const isFriendly = battleType === 'amistoso';

  const winReward = {
    xpEarned: isFriendly ? 180 : 350,
    coinsEarned: isFriendly ? 200 : 400,
    itemDropped: null
  };
  const loseReward = {
    xpEarned: isFriendly ? 60 : 90,
    coinsEarned: isFriendly ? 60 : 100,
    itemDropped: null
  };

  if (!isFriendly) {
    const roll = Math.random();
    if (roll < 0.40) winReward.itemDropped = 'potion_30';
    else if (roll < 0.70) winReward.itemDropped = 'revive_10';
    else if (roll < 0.90) winReward.itemDropped = 'revive_50';
    else winReward.itemDropped = 'heal_full';

    await client.query(`
      INSERT INTO user_items (user_id, item_key, quantity)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = user_items.quantity + 1
    `, [winnerId, winReward.itemDropped]);

    // Persistir HP restante en user_cards para ambos jugadores en reto oficial
    for (const card of [...cTeam, ...oTeam]) {
      if (card && card.user_card_id) {
        await client.query(`
          UPDATE user_cards SET current_hp = GREATEST(0, LEAST(max_hp, $1)) WHERE id = $2
        `, [card.current_hp, card.user_card_id]);
      }
    }
  }

  // Otorgar XP y monedas a ganador y perdedor
  await client.query(`UPDATE users SET battle_pass_xp = battle_pass_xp + $1, coins = coins + $2 WHERE id = $3`, [
    winReward.xpEarned, winReward.coinsEarned, winnerId
  ]);
  await client.query(`UPDATE users SET battle_pass_xp = battle_pass_xp + $1, coins = coins + $2 WHERE id = $3`, [
    loseReward.xpEarned, loseReward.coinsEarned, loserId
  ]);

  const usersRes = await client.query('SELECT id, username FROM users WHERE id IN ($1, $2)', [battle.challenger_id, battle.opponent_id]);
  const userMap = Object.fromEntries(usersRes.rows.map(u => [u.id, u.username]));

  await client.query(`
    INSERT INTO battles (user_id, opponent_id, opponent_name, battle_type, result, xp_earned, coins_earned, item_reward)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    battle.challenger_id,
    battle.opponent_id,
    userMap[battle.opponent_id] || 'Rival',
    battleType,
    winnerId === battle.challenger_id ? 'victoria' : 'derrota',
    winnerId === battle.challenger_id ? winReward.xpEarned : loseReward.xpEarned,
    winnerId === battle.challenger_id ? winReward.coinsEarned : loseReward.coinsEarned,
    winnerId === battle.challenger_id ? winReward.itemDropped : null
  ]);

  await client.query(`
    INSERT INTO battles (user_id, opponent_id, opponent_name, battle_type, result, xp_earned, coins_earned, item_reward)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    battle.opponent_id,
    battle.challenger_id,
    userMap[battle.challenger_id] || 'Rival',
    battleType,
    winnerId === battle.opponent_id ? 'victoria' : 'derrota',
    winnerId === battle.opponent_id ? winReward.xpEarned : loseReward.xpEarned,
    winnerId === battle.opponent_id ? winReward.coinsEarned : loseReward.coinsEarned,
    winnerId === battle.opponent_id ? winReward.itemDropped : null
  ]);

  const rewardsPayload = {
    challenger: winnerId === battle.challenger_id ? winReward : loseReward,
    opponent: winnerId === battle.opponent_id ? winReward : loseReward
  };

  logs.push(`¡${userMap[winnerId]} ha ganado el combate!`);
  return rewardsPayload;
}

// ========================================================
// 1. GESTIÓN DE EQUIPO Y MOCHILA
// ========================================================

router.get('/team', authenticateToken, async (req, res) => {
  try {
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
        CASE WHEN uc.current_hp = 0 THEN 'Debilitado' ELSE 'Listo' END AS status_text
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1 AND uc.is_in_team = true
      ORDER BY uc.level DESC
      LIMIT 3
    `, [req.user.id]);

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
          CASE WHEN uc.current_hp = 0 THEN 'Debilitado' ELSE 'Listo' END AS status_text
        FROM user_cards uc
        JOIN pokemon_cards pc ON uc.card_id = pc.id
        WHERE uc.user_id = $1
        ORDER BY uc.is_in_team DESC, uc.level DESC
        LIMIT 3
      `, [req.user.id]);

      teamRes = fallbackRes;

      if (teamRes.rows.length > 0) {
        const ids = teamRes.rows.map(r => r.user_card_id);
        await db.query(`
          UPDATE user_cards SET is_in_team = (id = ANY($1::int[])) WHERE user_id = $2
        `, [ids, req.user.id]);
      }
    }

    const enrichedTeam = teamRes.rows.map(card => {
      const animated = getAnimatedSprites(card.card_id);
      return {
        ...card,
        moves: ensureFourMoves(card.moves, card.types, card.name),
        animated_front_url: animated.front,
        animated_back_url: animated.back
      };
    });

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

    res.json({ team: enrichedTeam, items: itemsRes.rows });
  } catch (error) {
    console.error('Error al obtener equipo:', error);
    res.status(500).json({ error: 'Error al consultar equipo de combate' });
  }
});

router.post('/set-team', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { teamCardIds } = req.body;
    if (!Array.isArray(teamCardIds) || teamCardIds.length === 0 || teamCardIds.length > 3) {
      return res.status(400).json({ error: 'Debes seleccionar entre 1 y 3 Pokémon para tu equipo' });
    }

    await client.query('BEGIN');
    await client.query('UPDATE user_cards SET is_in_team = false WHERE user_id = $1', [req.user.id]);
    await client.query(`UPDATE user_cards SET is_in_team = true WHERE id = ANY($1::int[]) AND user_id = $2`, [
      teamCardIds, req.user.id
    ]);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Equipo actualizado exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al configurar equipo:', error);
    res.status(500).json({ error: 'Error al guardar equipo de combate' });
  } finally {
    client.release();
  }
});

// ========================================================
// 2. SISTEMA DE RETOS Y COMBATES MULTIJUGADOR REALES EN VIVO
// ========================================================

// Consultar retos entrantes y combates activos del usuario
router.get('/challenges', authenticateToken, async (req, res) => {
  try {
    await ensureLiveBattlesTable();

    // Expirar automáticamente retos pendientes antiguos (> 15 minutos sin respuesta)
    await db.query(`
      UPDATE live_battles 
      SET status = 'cancelled' 
      WHERE status = 'pending' AND created_at < NOW() - INTERVAL '15 minutes'
    `);

    const resChallenges = await db.query(`
      SELECT 
        lb.id,
        lb.challenger_id,
        lb.opponent_id,
        lb.battle_type,
        lb.status,
        lb.created_at,
        uc.username AS challenger_name,
        uo.username AS opponent_name
      FROM live_battles lb
      JOIN users uc ON lb.challenger_id = uc.id
      JOIN users uo ON lb.opponent_id = uo.id
      WHERE (lb.challenger_id = $1 OR lb.opponent_id = $1)
        AND lb.status IN ('pending', 'active')
      ORDER BY lb.created_at DESC
    `, [req.user.id]);

    const incoming = resChallenges.rows.filter(r => r.opponent_id === req.user.id && r.status === 'pending');
    const outgoing = resChallenges.rows.filter(r => r.challenger_id === req.user.id && r.status === 'pending');
    const active = resChallenges.rows.filter(r => r.status === 'active');

    res.json({ incoming, outgoing, active });
  } catch (error) {
    console.error('Error al consultar retos:', error);
    res.status(500).json({ error: 'Error al consultar retos pendientes' });
  }
});

// Enviar un reto real a un amigo aceptado (queda pendiente hasta que el rival acepte)
router.post('/challenge', authenticateToken, async (req, res) => {
  try {
    await ensureLiveBattlesTable();
    const { opponentId, battleType = 'amistoso', selectedUserCardId } = req.body;

    if (!opponentId || opponentId === req.user.id) {
      return res.status(400).json({ error: 'Oponente no válido' });
    }

    // Verificar que son amigos aceptados
    const friendCheck = await db.query(`
      SELECT id FROM friends 
      WHERE status = 'accepted' 
        AND ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
    `, [req.user.id, opponentId]);

    if (friendCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Solo puedes retar a amigos que hayan aceptado tu solicitud.' });
    }

    const oppRes = await db.query('SELECT id, username FROM users WHERE id = $1', [opponentId]);
    if (oppRes.rows.length === 0) {
      return res.status(404).json({ error: 'El rival no existe' });
    }
    const opponentUser = oppRes.rows[0];

    const challengerTeam = await buildPlayerTeamSnapshot(db, req.user.id, battleType, selectedUserCardId);
    if (challengerTeam.length === 0) {
      return res.status(400).json({ error: 'No tienes cartas en tu colección para combatir' });
    }

    if (battleType === 'normal' && challengerTeam.every(c => c.current_hp <= 0)) {
      return res.status(400).json({ error: 'Todos tus Pokémon están debilitados. Cúralos en el Centro Pokémon antes de retar.' });
    }

    // Cancelar retos pendientes anteriores entre estos mismos jugadores
    await db.query(`
      UPDATE live_battles 
      SET status = 'cancelled' 
      WHERE challenger_id = $1 AND opponent_id = $2 AND status = 'pending'
    `, [req.user.id, opponentId]);

    const initialLogs = [
      `Reto enviado a ${opponentUser.username} (${battleType === 'amistoso' ? 'Combate Amistoso · Nv. 5' : 'Reto Oficial'}).`,
      `Esperando a que ${opponentUser.username} acepte el combate...`
    ];

    const insertRes = await db.query(`
      INSERT INTO live_battles (
        challenger_id, opponent_id, battle_type, status, challenger_team, battle_logs
      ) VALUES ($1, $2, $3, 'pending', $4, $5)
      RETURNING *
    `, [
      req.user.id,
      opponentId,
      battleType,
      JSON.stringify(challengerTeam),
      JSON.stringify(initialLogs)
    ]);

    const view = formatBattleViewForUser(insertRes.rows[0], req.user.id, req.user.username, opponentUser.username);
    res.json({ battle: view });
  } catch (error) {
    console.error('Error al crear reto:', error);
    res.status(500).json({ error: 'Error al enviar reto de combate' });
  }
});

// Aceptar un reto recibido y comenzar el combate real
router.post('/live/:battleId/accept', authenticateToken, async (req, res) => {
  try {
    await ensureLiveBattlesTable();
    const { battleId } = req.params;
    const { selectedUserCardId } = req.body || {};

    const battleRes = await db.query('SELECT * FROM live_battles WHERE id = $1', [battleId]);
    if (battleRes.rows.length === 0) return res.status(404).json({ error: 'Reto no encontrado' });

    const battle = battleRes.rows[0];
    if (battle.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para aceptar este reto' });
    }
    if (battle.status !== 'pending') {
      return res.status(400).json({ error: 'Este reto ya no está disponible' });
    }

    const opponentTeam = await buildPlayerTeamSnapshot(db, req.user.id, battle.battle_type, selectedUserCardId);
    if (opponentTeam.length === 0) {
      return res.status(400).json({ error: 'No tienes Pokémon en tu colección para combatir' });
    }

    if (battle.battle_type === 'normal' && opponentTeam.every(c => c.current_hp <= 0)) {
      return res.status(400).json({ error: 'Todos tus Pokémon están debilitados. Cúralos en el Centro Pokémon primero.' });
    }

    const usersRes = await db.query('SELECT id, username FROM users WHERE id IN ($1, $2)', [battle.challenger_id, battle.opponent_id]);
    const userMap = Object.fromEntries(usersRes.rows.map(u => [u.id, u.username]));

    const challengerActive = battle.challenger_team[0];
    const opponentActive = opponentTeam[0];
    const firstTurnUserId = (challengerActive.spd || 50) >= (opponentActive.spd || 50)
      ? battle.challenger_id
      : battle.opponent_id;

    const logs = [
      `¡${req.user.username} aceptó el combate!`,
      `${userMap[battle.challenger_id]} envía a ${challengerActive.name} (Nv. ${challengerActive.level}).`,
      `${req.user.username} envía a ${opponentActive.name} (Nv. ${opponentActive.level}).`,
      `Turno inicial para ${userMap[firstTurnUserId]}.`
    ];

    const updatedRes = await db.query(`
      UPDATE live_battles
      SET opponent_team = $1,
          status = 'active',
          turn_user_id = $2,
          battle_logs = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [JSON.stringify(opponentTeam), firstTurnUserId, JSON.stringify(logs), battleId]);

    const view = formatBattleViewForUser(updatedRes.rows[0], req.user.id, userMap[battle.challenger_id], userMap[battle.opponent_id]);
    res.json({ battle: view });
  } catch (error) {
    console.error('Error al aceptar reto:', error);
    res.status(500).json({ error: 'Error al aceptar reto' });
  }
});

// Rechazar reto entrante
router.post('/live/:battleId/reject', authenticateToken, async (req, res) => {
  try {
    await db.query(`
      UPDATE live_battles SET status = 'rejected', updated_at = NOW()
      WHERE id = $1 AND opponent_id = $2 AND status = 'pending'
    `, [req.params.battleId, req.user.id]);
    res.json({ message: 'Reto rechazado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al rechazar reto' });
  }
});

// Cancelar reto saliente
router.post('/live/:battleId/cancel', authenticateToken, async (req, res) => {
  try {
    await db.query(`
      UPDATE live_battles SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND challenger_id = $2 AND status = 'pending'
    `, [req.params.battleId, req.user.id]);
    res.json({ message: 'Reto cancelado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar reto' });
  }
});

// Obtener estado en vivo del combate (polling de ambos jugadores)
router.get('/live/:battleId', authenticateToken, async (req, res) => {
  try {
    await ensureLiveBattlesTable();
    const resB = await db.query('SELECT * FROM live_battles WHERE id = $1', [req.params.battleId]);
    if (resB.rows.length === 0) return res.status(404).json({ error: 'Combate no encontrado' });

    const battle = resB.rows[0];
    if (battle.challenger_id !== req.user.id && battle.opponent_id !== req.user.id) {
      return res.status(403).json({ error: 'No perteneces a este combate' });
    }

    const usersRes = await db.query('SELECT id, username FROM users WHERE id IN ($1, $2)', [battle.challenger_id, battle.opponent_id]);
    const userMap = Object.fromEntries(usersRes.rows.map(u => [u.id, u.username]));

    const view = formatBattleViewForUser(battle, req.user.id, userMap[battle.challenger_id], userMap[battle.opponent_id]);
    res.json({ battle: view });
  } catch (error) {
    console.error('Error al consultar combate en vivo:', error);
    res.status(500).json({ error: 'Error al sincronizar combate' });
  }
});

// Ejecutar acción real por turnos (Atacar, Escudo, Curar, Cambiar Pokémon o Rendirse)
router.post('/live/:battleId/action', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await ensureLiveBattlesTable();
    const { battleId } = req.params;
    const { actionType, moveIndex = 0, switchIndex } = req.body;

    await client.query('BEGIN');
    const resB = await client.query('SELECT * FROM live_battles WHERE id = $1 FOR UPDATE', [battleId]);
    if (resB.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Combate no encontrado' });
    }

    const battle = resB.rows[0];
    const isChallenger = battle.challenger_id === req.user.id;
    const isParticipant = isChallenger || battle.opponent_id === req.user.id;

    if (!isParticipant) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'No participas en este combate' });
    }
    if (battle.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El combate ya ha finalizado' });
    }

    const opponentUserId = isChallenger ? battle.opponent_id : battle.challenger_id;
    const usersRes = await client.query('SELECT id, username FROM users WHERE id IN ($1, $2)', [battle.challenger_id, battle.opponent_id]);
    const userMap = Object.fromEntries(usersRes.rows.map(u => [u.id, u.username]));

    let cTeam = battle.challenger_team;
    let oTeam = battle.opponent_team;
    let cIdx = battle.challenger_active_idx;
    let oIdx = battle.opponent_active_idx;
    let cEnergy = battle.challenger_energy;
    let oEnergy = battle.opponent_energy;
    let cShield = battle.challenger_shield;
    let oShield = battle.opponent_shield;
    let cAtkBuff = parseFloat(battle.challenger_atk_buff);
    let oAtkBuff = parseFloat(battle.opponent_atk_buff);
    let cDefBuff = parseFloat(battle.challenger_def_buff);
    let oDefBuff = parseFloat(battle.opponent_def_buff);
    let mustSwitchId = battle.must_switch_user_id;
    let turnNumber = battle.turn_number;
    let nextTurnUserId = opponentUserId;
    let status = battle.status;
    let winnerId = battle.winner_id;
    let rewards = battle.rewards;
    const logs = Array.isArray(battle.battle_logs) ? [...battle.battle_logs] : [];
    let lastEvent = null;

    // Rendirse en cualquier momento
    if (actionType === 'forfeit') {
      winnerId = opponentUserId;
      status = 'finished';
      logs.push(`${req.user.username} se retiró del combate.`);
      rewards = await finalizeLiveBattle(client, battle, winnerId, req.user.id, battle.battle_type, cTeam, oTeam, logs);
      lastEvent = { id: Date.now(), actorId: req.user.id, actionType: 'forfeit' };
    } else {
      // Verificar turno del jugador
      if (battle.turn_user_id !== req.user.id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Aún es turno de tu rival. Espera su movimiento.' });
      }

      const myTeam = isChallenger ? cTeam : oTeam;
      const oppTeam = isChallenger ? oTeam : cTeam;
      const myActiveIdx = isChallenger ? cIdx : oIdx;
      const oppActiveIdx = isChallenger ? oIdx : cIdx;
      const myActive = myTeam[myActiveIdx];
      const oppActive = oppTeam[oppActiveIdx];

      if (mustSwitchId === req.user.id && actionType !== 'switch') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Debes elegir un nuevo Pokémon para continuar.' });
      }

      if (actionType === 'switch') {
        const targetIdx = parseInt(switchIndex, 10);
        if (isNaN(targetIdx) || !myTeam[targetIdx] || myTeam[targetIdx].current_hp <= 0 || targetIdx === myActiveIdx) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Selección de relevo no válida' });
        }

        if (isChallenger) {
          cIdx = targetIdx;
          cShield = false;
          cAtkBuff = 1.0;
          cDefBuff = 1.0;
        } else {
          oIdx = targetIdx;
          oShield = false;
          oAtkBuff = 1.0;
          oDefBuff = 1.0;
        }

        const wasForcedFaintSwitch = mustSwitchId === req.user.id;
        mustSwitchId = null;

        logs.push(`${req.user.username} envía a ${myTeam[targetIdx].name} al campo.`);
        lastEvent = {
          id: Date.now(),
          actorId: req.user.id,
          actionType: 'switch',
          pokemonName: myTeam[targetIdx].name
        };

        // Si el cambio fue forzado por debilitamiento, ahora le toca atacar a quien envió el relevo;
        // si fue cambio táctico voluntario, consume su turno.
        nextTurnUserId = wasForcedFaintSwitch ? req.user.id : opponentUserId;
        if (!wasForcedFaintSwitch) turnNumber += 1;
      } else if (actionType === 'shield') {
        if (isChallenger) cShield = true;
        else oShield = true;

        logs.push(`${myActive.name} activó Escudo Protector (-75% daño al siguiente ataque).`);
        lastEvent = { id: Date.now(), actorId: req.user.id, actionType: 'shield', actorName: req.user.username };
        turnNumber += 1;
      } else if (actionType === 'heal') {
        const healAmount = 50;
        const oldHp = myActive.current_hp;
        myActive.current_hp = Math.min(myActive.max_hp, myActive.current_hp + healAmount);
        const healed = myActive.current_hp - oldHp;

        logs.push(`${req.user.username} usó Poción de Campo en ${myActive.name} (+${healed} HP).`);
        lastEvent = {
          id: Date.now(),
          actorId: req.user.id,
          actionType: 'heal',
          healAmount: healed,
          targetSide: isChallenger ? 'challenger' : 'opponent'
        };
        turnNumber += 1;
      } else if (actionType === 'attack') {
        const moves = myActive.moves || [];
        const move = moves[moveIndex] || moves[0];
        if (!move) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Movimiento no válido' });
        }

        const myEnergy = isChallenger ? cEnergy : oEnergy;
        if (move.category === 'charged' && myEnergy < (move.energyCost || 45)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Necesitas ${move.energyCost || 45} de energía para usar ${move.name}.` });
        }

        if (move.category === 'buff') {
          if (isChallenger) {
            cAtkBuff = Math.min(1.6, +(cAtkBuff + 0.2).toFixed(2));
            cDefBuff = Math.min(1.6, +(cDefBuff + 0.15).toFixed(2));
            cEnergy = Math.min(100, cEnergy + 25);
          } else {
            oAtkBuff = Math.min(1.6, +(oAtkBuff + 0.2).toFixed(2));
            oDefBuff = Math.min(1.6, +(oDefBuff + 0.15).toFixed(2));
            oEnergy = Math.min(100, oEnergy + 25);
          }
          if (move.healAmount > 0) {
            myActive.current_hp = Math.min(myActive.max_hp, myActive.current_hp + move.healAmount);
          }
          logs.push(`${myActive.name} usó ${move.name}: potenció sus estadísticas.`);
          lastEvent = {
            id: Date.now(),
            actorId: req.user.id,
            actionType: 'buff',
            moveName: move.name,
            moveType: move.type
          };
          turnNumber += 1;
        } else {
          const myAtkBuff = isChallenger ? cAtkBuff : oAtkBuff;
          const oppDefBuff = isChallenger ? oDefBuff : cDefBuff;
          const oppHasShield = isChallenger ? oShield : cShield;

          const { damage, isCrit, effectivenessText } = calculatePvpDamage(
            myActive, oppActive, move, myAtkBuff, oppDefBuff, oppHasShield
          );

          oppActive.current_hp = Math.max(0, oppActive.current_hp - damage);

          // Consumir escudo del rival si lo tenía activo y actualizar energía del atacante
          if (isChallenger) {
            oShield = false;
            cEnergy = move.category === 'charged'
              ? Math.max(0, cEnergy - (move.energyCost || 45))
              : Math.min(100, cEnergy + (move.energyGen || 18));
          } else {
            cShield = false;
            oEnergy = move.category === 'charged'
              ? Math.max(0, oEnergy - (move.energyCost || 45))
              : Math.min(100, oEnergy + (move.energyGen || 18));
          }

          logs.push(`${myActive.name} usó ${move.name} (-${damage} HP). ${effectivenessText}`.trim());

          lastEvent = {
            id: Date.now(),
            actorId: req.user.id,
            actionType: 'attack',
            animationType: move.animationType || 'normal',
            moveName: move.name,
            moveType: move.type,
            isCharged: move.category === 'charged',
            damage,
            isCrit,
            effectivenessText,
            targetSide: isChallenger ? 'opponent' : 'challenger'
          };

          turnNumber += 1;

          // Comprobar si el Pokémon defensor se debilitó
          if (oppActive.current_hp <= 0) {
            logs.push(`¡${oppActive.name} se ha debilitado!`);
            const hasAliveBackup = oppTeam.some((c, i) => i !== oppActiveIdx && c.current_hp > 0);
            if (hasAliveBackup) {
              mustSwitchId = opponentUserId;
              nextTurnUserId = opponentUserId;
            } else {
              status = 'finished';
              winnerId = req.user.id;
              rewards = await finalizeLiveBattle(client, battle, winnerId, opponentUserId, battle.battle_type, cTeam, oTeam, logs);
            }
          }
        }
      }
    }

    const updatedRes = await client.query(`
      UPDATE live_battles
      SET challenger_team = $1,
          opponent_team = $2,
          challenger_active_idx = $3,
          opponent_active_idx = $4,
          challenger_energy = $5,
          opponent_energy = $6,
          challenger_shield = $7,
          opponent_shield = $8,
          challenger_atk_buff = $9,
          opponent_atk_buff = $10,
          challenger_def_buff = $11,
          opponent_def_buff = $12,
          must_switch_user_id = $13,
          turn_user_id = $14,
          turn_number = $15,
          status = $16,
          winner_id = $17,
          rewards = $18,
          last_event = $19,
          battle_logs = $20,
          updated_at = NOW()
      WHERE id = $21
      RETURNING *
    `, [
      JSON.stringify(cTeam),
      JSON.stringify(oTeam),
      cIdx,
      oIdx,
      cEnergy,
      oEnergy,
      cShield,
      oShield,
      cAtkBuff,
      oAtkBuff,
      cDefBuff,
      oDefBuff,
      mustSwitchId,
      nextTurnUserId,
      turnNumber,
      status,
      winnerId,
      rewards ? JSON.stringify(rewards) : null,
      lastEvent ? JSON.stringify(lastEvent) : null,
      JSON.stringify(logs.slice(-20)),
      battleId
    ]);

    await client.query('COMMIT');

    const view = formatBattleViewForUser(updatedRes.rows[0], req.user.id, userMap[battle.challenger_id], userMap[battle.opponent_id]);
    res.json({ battle: view });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en acción de combate:', error);
    res.status(500).json({ error: 'Error al procesar jugada de combate' });
  } finally {
    client.release();
  }
});

// ========================================================
// 3. CENTRO POKÉMON Y CURACIÓN FUERA DE COMBATE
// ========================================================

router.post('/heal-team', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE user_cards SET current_hp = max_hp WHERE user_id = $1`, [req.user.id]);
    await client.query('COMMIT');
    res.json({ message: '¡Equipo completamente curado y revitalizado en el Centro Pokémon!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al curar equipo:', error);
    res.status(500).json({ error: 'Error al curar Pokémon' });
  } finally {
    client.release();
  }
});

router.post('/heal-card', authenticateToken, async (req, res) => {
  const { userCardId, healAmount = 50 } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const cardRes = await client.query(`SELECT id, current_hp, max_hp FROM user_cards WHERE id = $1 AND user_id = $2`, [userCardId, req.user.id]);
    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Carta no encontrada' });
    }
    const card = cardRes.rows[0];
    const newHp = Math.min(card.max_hp, card.current_hp + healAmount);
    await client.query(`UPDATE user_cards SET current_hp = $1 WHERE id = $2`, [newHp, userCardId]);
    await client.query('COMMIT');
    res.json({
      message: `¡Poción aplicada! +${newHp - card.current_hp} HP.`,
      currentHp: newHp,
      maxHp: card.max_hp
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error al curar carta' });
  } finally {
    client.release();
  }
});

module.exports = router;
