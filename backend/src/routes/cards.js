const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');
const { generateMovesForPokemon } = require('../data/movesList');
const { ensureCatalogInitialized } = require('../db/ensureCatalog');

const POKEAPI_TYPE_MAP = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  grass: 'Planta',
  electric: 'Eléctrico',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  steel: 'Acero',
  fairy: 'Hada',
  dark: 'Siniestro'
};

const SPANISH_TO_POKEAPI_TYPE = Object.fromEntries(
  Object.entries(POKEAPI_TYPE_MAP).map(([en, es]) => [es.toLowerCase(), en])
);

const pokeApiTypeCache = new Map();

// Consultar especies de toda la PokéAPI (Gen 1-9, #1 a #1025) por tipo elemental con caché
router.get('/pokeapi-type/:typeName', authenticateToken, async (req, res) => {
  try {
    const rawType = (req.params.typeName || '').trim();
    const apiType = SPANISH_TO_POKEAPI_TYPE[rawType.toLowerCase()];

    if (!apiType) {
      return res.status(400).json({ error: `Tipo elemental "${rawType}" no reconocido.` });
    }

    if (pokeApiTypeCache.has(apiType)) {
      return res.json(pokeApiTypeCache.get(apiType));
    }

    const apiRes = await fetch(`https://pokeapi.co/api/v2/type/${apiType}`);
    if (!apiRes.ok) {
      return res.status(502).json({ error: 'No se pudo consultar el catálogo de tipos de PokéAPI.' });
    }

    const data = await apiRes.json();
    const seen = new Set();
    const species = [];

    for (const entry of data.pokemon || []) {
      const parts = (entry.pokemon?.url || '').split('/').filter(Boolean);
      const id = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(id) && id >= 1 && id <= 1025 && !seen.has(id)) {
        seen.add(id);
        const name = entry.pokemon.name.charAt(0).toUpperCase() + entry.pokemon.name.slice(1);
        species.push({ id, name });
      }
    }

    species.sort((a, b) => a.id - b.id);
    const payload = {
      type: POKEAPI_TYPE_MAP[apiType],
      apiType,
      total: species.length,
      ids: species.map(s => s.id),
      species
    };

    pokeApiTypeCache.set(apiType, payload);
    res.json(payload);
  } catch (error) {
    console.error('Error al consultar tipo en PokéAPI:', error);
    res.status(500).json({ error: 'Error al consultar PokéAPI por tipo' });
  }
});

// Obtener catálogo local de la Pokédex con estado del usuario
router.get('/pokedex', authenticateToken, async (req, res) => {
  try {
    const pokedexRes = await db.query(`
      SELECT 
        pc.id,
        pc.name,
        pc.types,
        pc.hp_base,
        pc.atk_base,
        pc.sprite_url,
        pc.artwork_url,
        pc.rarity,
        pc.evolution_stage,
        pc.evolves_from_id,
        pc.evolves_to_id,
        COALESCE(COUNT(uc.id), 0)::int AS count_copies,
        CASE WHEN COUNT(uc.id) > 0 THEN true ELSE false END AS is_registered,
        COALESCE(MAX(uc.level), 0)::int AS max_level
      FROM pokemon_cards pc
      LEFT JOIN user_cards uc ON pc.id = uc.card_id AND uc.user_id = $1
      GROUP BY pc.id
      ORDER BY pc.id ASC
    `, [req.user.id]);

    const totalRegistered = pokedexRes.rows.filter(p => p.is_registered).length;

    res.json({
      totalCards: 1025,
      totalLocalCards: pokedexRes.rows.length,
      totalRegistered,
      cards: pokedexRes.rows
    });
  } catch (error) {
    console.error('Error al obtener Pokédex:', error);
    res.status(500).json({ error: 'Error al consultar la Pokédex' });
  }
});

// Obtener todas las cartas del usuario (Álbum e Inventario)
router.get('/album', authenticateToken, async (req, res) => {
  try {
    const userCardsRes = await db.query(`
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
        EXISTS (
          SELECT 1 FROM trades t 
          WHERE t.offered_user_card_id = uc.id AND t.status = 'pending'
        ) AS in_pending_trade,
        pc.id AS card_id,
        pc.name,
        pc.types,
        pc.sprite_url,
        pc.artwork_url,
        pc.rarity,
        pc.evolution_stage,
        pc.evolves_from_id,
        pc.evolves_to_id,
        (SELECT name FROM pokemon_cards WHERE id = pc.evolves_to_id) AS evolves_to_name,
        (SELECT artwork_url FROM pokemon_cards WHERE id = pc.evolves_to_id) AS evolves_to_artwork
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.user_id = $1
      ORDER BY pc.id ASC, uc.level DESC
    `, [req.user.id]);

    res.json({ cards: userCardsRes.rows });
  } catch (error) {
    console.error('Error al obtener álbum:', error);
    res.status(500).json({ error: 'Error al consultar álbum de cartas' });
  }
});

// Obtener detalle de evolución para una especie o carta seleccionada + inventario de prismas
router.get('/evolution-chain/:cardId', authenticateToken, async (req, res) => {
  try {
    await ensureCatalogInitialized();
    const { cardId } = req.params;

    const baseRes = await db.query('SELECT * FROM pokemon_cards WHERE id = $1', [cardId]);
    if (baseRes.rows.length === 0) return res.status(404).json({ error: 'Carta no encontrada' });

    let current = baseRes.rows[0];
    while (current.evolves_from_id) {
      const prev = await db.query('SELECT * FROM pokemon_cards WHERE id = $1', [current.evolves_from_id]);
      if (prev.rows.length === 0) break;
      current = prev.rows[0];
    }

    const chain = [];
    let cur = current;
    while (cur) {
      const userCopies = await db.query(`
        SELECT 
          uc.id, uc.level, uc.current_hp, uc.max_hp, uc.atk,
          COALESCE(uc.def, 50) AS def,
          COALESCE(uc.spd, 50) AS spd,
          COALESCE(uc.iv_percentage, 85) AS iv_percentage,
          uc.moves,
          uc.is_in_team,
          EXISTS (
            SELECT 1 FROM trades t WHERE t.offered_user_card_id = uc.id AND t.status = 'pending'
          ) AS in_pending_trade
        FROM user_cards uc
        WHERE uc.user_id = $1 AND uc.card_id = $2
        ORDER BY uc.level DESC, uc.id ASC
      `, [req.user.id, cur.id]);

      chain.push({
        ...cur,
        userCopiesCount: userCopies.rows.length,
        ownedCopies: userCopies.rows
      });

      if (cur.evolves_to_id) {
        const next = await db.query('SELECT * FROM pokemon_cards WHERE id = $1', [cur.evolves_to_id]);
        cur = next.rows.length > 0 ? next.rows[0] : null;
      } else {
        cur = null;
      }
    }

    const prismsRes = await db.query(`
      SELECT item_key, quantity FROM user_items 
      WHERE user_id = $1 AND item_key IN ('prisma_evolucion', 'prisma_maestro')
    `, [req.user.id]);

    const prisms = { prisma_evolucion: 0, prisma_maestro: 0 };
    prismsRes.rows.forEach(p => {
      prisms[p.item_key] = p.quantity;
    });

    res.json({ chain, prisms });
  } catch (error) {
    console.error('Error al consultar cadena de evolución:', error);
    res.status(500).json({ error: 'Error al consultar cadena de evolución' });
  }
});

// Mejorar nivel de carta (Nv. 1 a Nv. 5) con PokéMonedas
router.post('/upgrade', authenticateToken, async (req, res) => {
  const { userCardId } = req.body;
  if (!userCardId) return res.status(400).json({ error: 'userCardId es requerido' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const cardRes = await client.query(`
      SELECT uc.*, pc.name, pc.hp_base, pc.atk_base
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.id = $1 AND uc.user_id = $2
      FOR UPDATE
    `, [userCardId, req.user.id]);

    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Carta no encontrada en tu álbum' });
    }

    const card = cardRes.rows[0];
    if (card.level >= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La carta ya está en su nivel máximo (Nivel 5).' });
    }

    const upgradeCost = 500;
    const userRes = await client.query('SELECT coins FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (userRes.rows[0].coins < upgradeCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `PokéMonedas insuficientes. Necesitas ${upgradeCost} monedas.` });
    }

    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [upgradeCost, req.user.id]);

    const nextLevel = card.level + 1;
    const ivFactor = (card.iv_percentage || 85) / 100;
    const nextMaxHp = Math.round(card.hp_base * (1 + (nextLevel - 1) * 0.25));
    const nextAtk = Math.round(card.atk_base * (1 + (nextLevel - 1) * 0.25));
    const nextDef = Math.round(card.atk_base * 0.85 * (1 + (nextLevel - 1) * 0.20) * ivFactor);
    const nextSpd = Math.round((card.hp_base + card.atk_base) * 0.5 * (1 + (nextLevel - 1) * 0.10) * ivFactor);
    const nextCurrentHp = card.current_hp > 0
      ? Math.min(nextMaxHp, card.current_hp + Math.round(card.hp_base * 0.25))
      : 0;

    const updatedCardRes = await client.query(`
      UPDATE user_cards 
      SET level = $1, max_hp = $2, current_hp = $3, atk = $4, def = $5, spd = $6
      WHERE id = $7 
      RETURNING *
    `, [nextLevel, nextMaxHp, nextCurrentHp, nextAtk, nextDef, nextSpd, userCardId]);

    const updatedUser = await client.query('SELECT coins FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡${card.name} ha subido al Nivel ${nextLevel}!`,
      card: updatedCardRes.rows[0],
      userCoins: updatedUser.rows[0].coins
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al mejorar carta:', error);
    res.status(500).json({ error: 'Error al subir nivel de carta' });
  } finally {
    client.release();
  }
});

// Evolucionar carta por 3 métodos:
// - mode: 'copies' (Nivel 5 + 3 copias de la especie -> consume 2 adicionales)
// - mode: 'prisma_evolucion' (Nivel 5 + 1 Prisma Evolutivo -> sin copias repetidas)
// - mode: 'prisma_maestro' (Cualquier nivel 1-5 + 1 Prisma Arcoíris Maestro -> sin nivel 5 ni copias)
router.post('/evolve', authenticateToken, async (req, res) => {
  const { userCardId, mode = 'copies' } = req.body;
  if (!userCardId) return res.status(400).json({ error: 'userCardId es requerido' });
  if (!['copies', 'prisma_evolucion', 'prisma_maestro'].includes(mode)) {
    return res.status(400).json({ error: 'Modo de evolución no válido' });
  }

  const client = await db.pool.connect();
  try {
    await ensureCatalogInitialized();
    await client.query('BEGIN');

    const cardRes = await client.query(`
      SELECT uc.*, pc.name, pc.evolves_to_id, pc.evolution_stage
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.id = $1 AND uc.user_id = $2
      FOR UPDATE
    `, [userCardId, req.user.id]);

    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Carta no encontrada' });
    }

    const card = cardRes.rows[0];

    if (!card.evolves_to_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `${card.name} ya está en su evolución final máxima.` });
    }

    // No permitir evolucionar la copia exacta que está reservada en un trade pendiente
    const pendingCheck = await client.query(
      "SELECT id FROM trades WHERE offered_user_card_id = $1 AND status = 'pending'",
      [userCardId]
    );
    if (pendingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Esta carta está ofrecida en un intercambio pendiente. Cancélalo primero si deseas evolucionarla.' });
    }

    let xpBonus = 200;

    if (mode === 'copies') {
      if (card.level < 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `La carta debe alcanzar el Nivel 5 antes de evolucionar por copias (actual: Nv. ${card.level}).` });
      }

      const copiesRes = await client.query(`
        SELECT uc.id FROM user_cards uc
        WHERE uc.user_id = $1 AND uc.card_id = $2 AND uc.id != $3
          AND NOT EXISTS (
            SELECT 1 FROM trades t WHERE t.offered_user_card_id = uc.id AND t.status = 'pending'
          )
        ORDER BY uc.is_in_team ASC, uc.level ASC
      `, [req.user.id, card.card_id, userCardId]);

      if (copiesRes.rows.length < 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Necesitas 3 copias libres de ${card.name} para evolucionar por copias (tienes ${copiesRes.rows.length + 1}/3) o usa un Prisma Evolutivo.` 
        });
      }

      const copiesToDelete = [copiesRes.rows[0].id, copiesRes.rows[1].id];
      await client.query('DELETE FROM user_cards WHERE id = ANY($1::int[])', [copiesToDelete]);
    } else if (mode === 'prisma_evolucion') {
      if (card.level < 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El Prisma Evolutivo requiere que ${card.name} alcance el Nivel 5 (actual: Nv. ${card.level}).` });
      }

      const prismRes = await client.query(`
        SELECT quantity FROM user_items WHERE user_id = $1 AND item_key = 'prisma_evolucion' FOR UPDATE
      `, [req.user.id]);

      if (prismRes.rows.length === 0 || prismRes.rows[0].quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No tienes ningún Prisma Evolutivo en tu mochila. Puedes conseguirlos al abrir sobres.' });
      }

      await client.query(
        "UPDATE user_items SET quantity = quantity - 1 WHERE user_id = $1 AND item_key = 'prisma_evolucion'",
        [req.user.id]
      );
      xpBonus = 250;
    } else if (mode === 'prisma_maestro') {
      const prismRes = await client.query(`
        SELECT quantity FROM user_items WHERE user_id = $1 AND item_key = 'prisma_maestro' FOR UPDATE
      `, [req.user.id]);

      if (prismRes.rows.length === 0 || prismRes.rows[0].quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No tienes ningún Prisma Arcoíris Maestro en tu mochila.' });
      }

      await client.query(
        "UPDATE user_items SET quantity = quantity - 1 WHERE user_id = $1 AND item_key = 'prisma_maestro'",
        [req.user.id]
      );
      xpBonus = 350;
    }

    const targetSpeciesRes = await client.query('SELECT * FROM pokemon_cards WHERE id = $1', [card.evolves_to_id]);
    const targetSpecies = targetSpeciesRes.rows[0];

    const iv = card.iv_percentage || 85;
    const ivFactor = iv / 100;
    const evolvedDef = Math.round(targetSpecies.atk_base * 0.85 * ivFactor);
    const evolvedSpd = Math.round((targetSpecies.hp_base + targetSpecies.atk_base) * 0.5 * ivFactor);
    const evolvedMoves = generateMovesForPokemon(targetSpecies.types, targetSpecies.name);

    const updatedCard = await client.query(`
      UPDATE user_cards
      SET card_id = $1, level = 1, current_hp = $2, max_hp = $2, atk = $3, def = $4, spd = $5, moves = $6
      WHERE id = $7
      RETURNING *
    `, [
      targetSpecies.id,
      targetSpecies.hp_base,
      targetSpecies.atk_base,
      evolvedDef,
      evolvedSpd,
      JSON.stringify(evolvedMoves),
      userCardId
    ]);

    await client.query('UPDATE users SET battle_pass_xp = battle_pass_xp + $1 WHERE id = $2', [xpBonus, req.user.id]);

    await client.query('COMMIT');

    const methodText = mode === 'copies'
      ? 'usando copias repetidas'
      : mode === 'prisma_evolucion'
        ? 'usando un Prisma Evolutivo'
        : 'usando un Prisma Arcoíris Maestro';

    res.json({
      message: `¡Increíble! ¡${card.name} evolucionó en ${targetSpecies.name} ${methodText}! ✨ (+${xpBonus} XP)`,
      evolvedCard: {
        ...updatedCard.rows[0],
        name: targetSpecies.name,
        artwork_url: targetSpecies.artwork_url,
        sprite_url: targetSpecies.sprite_url,
        types: targetSpecies.types
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al evolucionar carta:', error);
    res.status(500).json({ error: 'Error al evolucionar carta' });
  } finally {
    client.release();
  }
});

// Buscar cualquier Pokémon en vivo a través de la PokéAPI o Base de Datos Local
router.get('/search-pokeapi', authenticateToken, async (req, res) => {
  try {
    const query = req.query.query ? req.query.query.trim().toLowerCase() : '';
    if (!query) {
      return res.status(400).json({ error: 'Debes proporcionar un nombre o número de Pokémon' });
    }

    const isNumeric = !isNaN(query);
    let localRes;
    if (isNumeric) {
      localRes = await db.query('SELECT * FROM pokemon_cards WHERE id = $1', [parseInt(query)]);
    } else {
      localRes = await db.query('SELECT * FROM pokemon_cards WHERE LOWER(name) = $1', [query]);
    }

    if (localRes.rows.length > 0) {
      const card = localRes.rows[0];
      const userCopiesRes = await db.query(`
        SELECT COUNT(*)::int as count FROM user_cards WHERE card_id = $1 AND user_id = $2
      `, [card.id, req.user.id]);
      const countCopies = userCopiesRes.rows[0].count;

      return res.json({
        found: true,
        source: 'local',
        card: {
          ...card,
          is_registered: countCopies > 0,
          count_copies: countCopies,
          animated_front_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${card.id}.gif`,
          animated_back_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${card.id}.gif`
        }
      });
    }

    const apiRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}`);
    if (!apiRes.ok) {
      return res.status(404).json({ error: `No se encontró ningún Pokémon con el término "${query}" en la PokéAPI.` });
    }

    const pokeData = await apiRes.json();
    const id = pokeData.id;
    const name = pokeData.name.charAt(0).toUpperCase() + pokeData.name.slice(1);
    const types = pokeData.types.map(t => POKEAPI_TYPE_MAP[t.type.name] || 'Normal');

    const hpStat = pokeData.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
    const atkStat = pokeData.stats.find(s => s.stat.name === 'attack')?.base_stat || 50;
    const defStat = pokeData.stats.find(s => s.stat.name === 'defense')?.base_stat || 50;
    const spdStat = pokeData.stats.find(s => s.stat.name === 'speed')?.base_stat || 50;

    const bst = hpStat + atkStat + defStat + spdStat;
    let rarity = 'comun';
    if (bst > 480) rarity = 'legendario';
    else if (bst > 330) rarity = 'rara';
    else if (bst > 250) rarity = 'poco_comun';

    const sprite_url = pokeData.sprites.front_default || '';
    const artwork_url = pokeData.sprites.other?.['official-artwork']?.front_default || sprite_url;
    const animated_front_url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`;
    const animated_back_url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${id}.gif`;

    const userCardCheck = await db.query(
      'SELECT COUNT(*)::int as count FROM user_cards WHERE card_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    const countCopies = userCardCheck.rows[0].count;

    res.json({
      found: true,
      source: 'pokeapi_live',
      card: {
        id,
        name,
        types,
        hp_base: hpStat,
        atk_base: atkStat,
        def: defStat,
        spd: spdStat,
        rarity,
        sprite_url,
        artwork_url,
        animated_front_url,
        animated_back_url,
        is_registered: countCopies > 0,
        count_copies: countCopies,
        moves: generateMovesForPokemon(types, name)
      }
    });

  } catch (error) {
    console.error('Error en búsqueda de PokéAPI:', error);
    res.status(500).json({ error: 'Error al consultar PokéAPI: ' + error.message });
  }
});

// Reclamar o Añadir una carta descubierta de PokéAPI a la colección del usuario
router.post('/claim-pokeapi-card', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { card } = req.body;
    if (!card || !card.id || !card.name) {
      return res.status(400).json({ error: 'Datos de carta incompletos' });
    }

    await client.query('BEGIN');

    await client.query(`
      INSERT INTO pokemon_cards (
        id, name, types, hp_base, atk_base, sprite_url, artwork_url, rarity, evolution_stage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        types = EXCLUDED.types,
        artwork_url = EXCLUDED.artwork_url,
        sprite_url = EXCLUDED.sprite_url
    `, [
      card.id,
      card.name,
      card.types || ['Normal'],
      card.hp_base || 60,
      card.atk_base || 60,
      card.sprite_url || '',
      card.artwork_url || card.sprite_url || '',
      ['comun', 'poco_comun', 'rara', 'legendario'].includes(card.rarity) ? card.rarity : 'rara'
    ]);

    const userCoinsRes = await client.query('SELECT coins FROM users WHERE id = $1', [req.user.id]);
    const currentCoins = userCoinsRes.rows[0].coins;
    let coinsDeducted = 0;
    if (currentCoins >= 50) {
      await client.query('UPDATE users SET coins = coins - 50 WHERE id = $1', [req.user.id]);
      coinsDeducted = 50;
    }

    const moves = card.moves || generateMovesForPokemon(card.types || ['Normal'], card.name);
    const iv = Math.floor(Math.random() * 26) + 75;
    const maxHp = (card.hp_base || 60) * 2;
    const atk = card.atk_base || 55;
    const def = card.def || 50;
    const spd = card.spd || 50;

    const userCardRes = await client.query(`
      INSERT INTO user_cards (
        user_id, card_id, level, current_hp, max_hp, atk, def, spd, iv_percentage, moves, is_in_team
      ) VALUES ($1, $2, 5, $3, $3, $4, $5, $6, $7, $8, false)
      RETURNING *
    `, [
      req.user.id,
      card.id,
      maxHp,
      atk,
      def,
      spd,
      iv,
      JSON.stringify(moves)
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `¡Felicidades! Has registrado a ${card.name} (#${card.id}) en tu colección con IV ${iv}%!`,
      coinsDeducted,
      userCard: {
        ...userCardRes.rows[0],
        name: card.name,
        artwork_url: card.artwork_url,
        sprite_url: card.sprite_url,
        types: card.types
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al reclamar carta de PokéAPI:', error);
    res.status(500).json({ error: 'Error al agregar carta a la colección: ' + error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
