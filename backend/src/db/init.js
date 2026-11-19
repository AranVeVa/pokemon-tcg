const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./index');
const { POKEMON_151 } = require('../data/pokemonList');
const { determineRarity } = require('../services/pokeApiService');

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('--- Iniciando inicialización de Base de Datos Pokémon TCG ---');
    
    // 1. Ejecutar Schema DDL
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('✅ Esquema y tablas creadas exitosamente.');

    // 2. Insertar Configuración del Sistema
    await client.query(`
      INSERT INTO system_config (key, value) VALUES
      ('season_info', '{"name": "Temporada Primavera", "start": "2026-03-01", "end": "2026-06-30"}'::jsonb),
      ('pack_rates_normal', '{"comun": 0.70, "poco_comun": 0.25, "rara": 0.05, "legendario": 0.00}'::jsonb),
      ('pack_rates_special', '{"comun": 0.35, "poco_comun": 0.40, "rara": 0.22, "legendario": 0.03}'::jsonb),
      ('pack_rates_legendary', '{"comun": 0.00, "poco_comun": 0.20, "rara": 0.40, "legendario": 0.40}'::jsonb),
      ('item_drop_rates', '{"potion_30": 0.50, "revive_10": 0.30, "revive_50": 0.15, "heal_full": 0.04, "revive_full": 0.01}'::jsonb)
    `);
    console.log('✅ Configuración inicial del sistema guardada.');

    // 3. Insertar Catálogo de Pokémon (151 originales de Kanto)
    console.log('Insertando 151 cartas de Pokémon con datos de PokéAPI...');
    for (const p of POKEMON_151) {
      const rarity = determineRarity(p.id, p.stage);
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
      const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;

      await client.query(`
        INSERT INTO pokemon_cards (id, name, types, hp_base, atk_base, sprite_url, artwork_url, rarity, evolution_stage, evolves_from_id, evolves_to_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL)
      `, [
        p.id,
        p.name,
        p.types,
        p.hp,
        p.atk,
        spriteUrl,
        artworkUrl,
        rarity,
        p.stage
      ]);
    }

    // Actualizar relaciones de evolución
    for (const p of POKEMON_151) {
      if (p.evolvesFrom || p.evolvesTo) {
        await client.query(`
          UPDATE pokemon_cards
          SET evolves_from_id = $1, evolves_to_id = $2
          WHERE id = $3
        `, [p.evolvesFrom || null, p.evolvesTo || null, p.id]);
      }
    }
    console.log('✅ 151 Cartas de Pokémon insertadas y relaciones de evolución configuradas.');

    // 4. Insertar Catálogo de Items
    await client.query(`
      INSERT INTO items (item_key, name, description, effect_type, effect_value, rarity, icon) VALUES
      ('potion_30', 'Poción +30 HP', 'Recupera 30 puntos de vida de un Pokémon.', 'heal_flat', 30, 'comun', 'potion'),
      ('heal_full', 'Cura total', 'Restaura el 100% de la vida de un Pokémon.', 'heal_percent', 100, 'rara', 'heal_full'),
      ('revive_10', 'Revivir 10%', 'Revive a un Pokémon debilitado con 10% de salud.', 'revive_percent', 10, 'comun', 'revive_10'),
      ('revive_50', 'Revivir 50%', 'Revive a un Pokémon debilitado con 50% de salud.', 'revive_percent', 50, 'poco_comun', 'revive_50'),
      ('revive_full', 'Revivir Máximo', 'Revive a un Pokémon debilitado con salud completa (100%).', 'revive_full', 100, 'rara', 'revive_full')
    `);
    console.log('✅ Items insertados.');

    // 5. Insertar Niveles del Pase de Batalla (1 al 50)
    for (let lvl = 1; lvl <= 50; lvl++) {
      let freeType = 'coins';
      let freeTitle = `${lvl * 250} PokéMonedas`;
      let freeValue = { coins: lvl * 250 };

      if (lvl % 5 === 0) {
        freeType = 'pack_normal';
        freeTitle = 'Sobre Normal';
        freeValue = { packType: 'normal' };
      }

      let premType = 'gems';
      let premTitle = `${lvl * 25} PokéGemas`;
      let premValue = { gems: lvl * 25 };

      if (lvl % 5 === 0) {
        premType = 'pack_special';
        premTitle = 'Sobre Especial + Items';
        premValue = { packType: 'especial', items: ['potion_30', 'revive_50'] };
      }

      if (lvl === 50) {
        freeTitle = 'Sobre Especial + 5,000 Monedas';
        freeType = 'special_bundle';
        freeValue = { coins: 5000, packType: 'especial' };

        premTitle = 'Blastoise EX Garantizado (Estadísticas Mejoradas)';
        premType = 'card_guaranteed';
        premValue = { cardId: 9, isEx: true, hp: 330, atk: 190 };
      }

      await client.query(`
        INSERT INTO battle_pass_rewards (level, free_type, free_title, free_value, premium_type, premium_title, premium_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [lvl, freeType, freeTitle, JSON.stringify(freeValue), premType, premTitle, JSON.stringify(premValue)]);
    }
    console.log('✅ 50 Niveles del Pase de Batalla generados.');

    // 6. Insertar Usuarios Demo
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);
    const studentPasswordHash = await bcrypt.hash('20010164', salt);

    // Ash_MX (matches Mockups: 4,850 coins, 1,200 gems, Nivel 18, 1,240 XP)
    const ashRes = await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems, battle_pass_xp, battle_pass_level, last_free_pack_claimed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '1 minute')
      RETURNING id
    `, ['Ash_MX', 'ash@correo.com', defaultPasswordHash, 'Premium', true, 4850, 1200, 1240, 18]);
    const ashId = ashRes.rows[0].id;

    // Misty_01 (Mockup 5, 7, 9)
    const mistyRes = await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems, battle_pass_xp, battle_pass_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, ['Misty_01', 'misty@correo.com', defaultPasswordHash, 'Normal', true, 2100, 50, 600, 7]);
    const mistyId = mistyRes.rows[0].id;

    // Brock_MX
    const brockRes = await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['Brock_MX', 'brock@correo.com', defaultPasswordHash, 'Normal', true, 1800, 20]);
    const brockId = brockRes.rows[0].id;

    // Gary_Oak (Admin)
    const garyRes = await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['Gary_Oak', 'gary@correo.com', defaultPasswordHash, 'Admin', true, 10000, 5000]);
    const garyId = garyRes.rows[0].id;

    // Dawn_22
    const dawnRes = await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, ['Dawn_22', 'dawn@correo.com', defaultPasswordHash, 'Premium', true, 3400, 800]);
    const dawnId = dawnRes.rows[0].id;

    // Serena_7
    await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['Serena_7', 'serena@correo.com', defaultPasswordHash, 'Normal', true, 1200, 0]);

    // Arantza (Student admin user)
    await client.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, coins, gems, battle_pass_xp, battle_pass_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, ['Arantza', 'arantza@correo.com', studentPasswordHash, 'Admin', true, 9999, 5000, 2500, 25]);

    console.log('✅ Usuarios del sistema creados (Ash_MX, Misty_01, Brock_MX, Gary_Oak, Dawn_22, Serena_7, Arantza).');

    // 7. Insertar Amigos para Ash_MX (Mockup 9: Misty_01, Brock_MX, Gary_Oak, Dawn_22)
    await client.query(`
      INSERT INTO friends (user_id, friend_id, status) VALUES
      ($1, $2, 'accepted'),
      ($1, $3, 'accepted'),
      ($1, $4, 'accepted'),
      ($1, $5, 'accepted')
    `, [ashId, mistyId, brockId, garyId, dawnId]);
    console.log('✅ Lista de amigos creada.');

    // 8. Insertar Items para Ash_MX (Mockup 10)
    await client.query(`
      INSERT INTO user_items (user_id, item_key, quantity) VALUES
      ($1, 'revive_10', 3),
      ($1, 'revive_50', 1),
      ($1, 'potion_30', 5),
      ($1, 'heal_full', 1),
      ($1, 'revive_full', 0)
    `, [ashId]);
    console.log('✅ Mochila de items de Ash_MX configurada.');

    // 9. Reclamar niveles 1 a 18 del Pase de Batalla para Ash_MX (Mockup 8: Nv 15, 16, 17, 18 Reclamados)
    for (let l = 1; l <= 18; l++) {
      await client.query(`
        INSERT INTO user_battle_pass_claims (user_id, level, track) VALUES
        ($1, $2, 'free'),
        ($1, $2, 'premium')
      `, [ashId, l]);
    }
    console.log('✅ Progreso de pase de batalla reclamado hasta nivel 18.');

    // 10. Insertar Cartas de Ash_MX (87 Pokémon registrados, con copias y niveles)
    // En particular:
    // Bulbasaur #1 (x2)
    // Charmander #4 (x1)
    // Squirtle #7 (Nv 5, 3 copias, hp 90, atk 60 - Mockup 6)
    // Pikachu #25 (x1)
    // Jigglypuff #39 (x1)
    // Gengar #94 (x2)
    // Eevee #133 (x4 copias - Mockup 7)
    // Togepi o Lapras: Lapras NO lo tiene Ash para poder hacer el intercambio con Misty!
    
    // Squirtle Nv 5 (3 copias para Ash)
    for (let i = 0; i < 3; i++) {
      await client.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, is_in_team)
        VALUES ($1, 7, 5, 90, 90, 60, ${i === 0})
      `, [ashId]);
    }

    // Eevee (4 copias para Ash)
    for (let i = 0; i < 4; i++) {
      await client.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
        VALUES ($1, 133, 1, 55, 55, 55)
      `, [ashId]);
    }

    // Bulbasaur (2 copias, en equipo)
    await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, is_in_team)
      VALUES ($1, 1, 3, 70, 70, 65, true), ($1, 1, 1, 45, 45, 49, false)
    `, [ashId]);

    // Pikachu (1 copia, en equipo pero debilitado para probar items! Mockup 10)
    await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, is_in_team)
      VALUES ($1, 25, 4, 0, 80, 75, true)
    `, [ashId]);

    // Charmander (1 copia)
    await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
      VALUES ($1, 4, 2, 50, 50, 58)
    `, [ashId]);

    // Jigglypuff (1 copia)
    await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
      VALUES ($1, 39, 1, 115, 115, 45)
    `, [ashId]);

    // Gengar (2 copias)
    await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
      VALUES ($1, 94, 2, 85, 85, 90), ($1, 94, 1, 60, 60, 65)
    `, [ashId]);

    // Insertar hasta completar 87 especies distintas para Ash_MX (sin incluir a Lapras #131)
    // Seleccionamos 80 IDs adicionales que no sean 1, 4, 7, 25, 39, 94, 133, 131
    const excludedIds = [1, 4, 7, 25, 39, 94, 131, 133];
    let addedCount = 7; // Bulbasaur, Charmander, Squirtle, Pikachu, Jigglypuff, Gengar, Eevee
    for (let cid = 2; cid <= 151 && addedCount < 87; cid++) {
      if (!excludedIds.includes(cid)) {
        await client.query(`
          INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk)
          VALUES ($1, $2, 1, 60, 60, 50)
        `, [ashId, cid]);
        addedCount++;
      }
    }
    console.log(`✅ ${addedCount} especies registradas asignadas a Ash_MX en Pokédex (87 total).`);

    // 11. Cartas para Misty_01 (Lapras #131 para intercambiar)
    const mistyLapras = await client.query(`
      INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, is_in_team)
      VALUES ($1, 131, 14, 100, 100, 85, true)
      RETURNING id
    `, [mistyId]);

    // Oferta de intercambio activa (Mockup 7: Ash ofrece Eevee x4 repetida <-> Recibe Lapras de Misty_01)
    const ashEeveeCard = await client.query(`
      SELECT id FROM user_cards WHERE user_id = $1 AND card_id = 133 LIMIT 1
    `, [ashId]);

    if (ashEeveeCard.rows.length > 0) {
      await client.query(`
        INSERT INTO trades (sender_id, receiver_id, offered_user_card_id, requested_card_id, status)
        VALUES ($1, $2, $3, $4, 'pending')
      `, [ashId, mistyId, ashEeveeCard.rows[0].id, 131]);
      console.log('✅ Oferta de intercambio de prueba entre Ash_MX y Misty_01 creada.');
    }

    // 12. Insertar Pagos de Stripe de prueba (Mockup 5 & 11)
    await client.query(`
      INSERT INTO payments (user_id, stripe_session_id, amount_mxn, product_type, status, customer_email) VALUES
      ($1, 'cs_test_mock_session_101', 149.00, 'Pase de Batalla Premium', 'completed', 'ash@correo.com'),
      ($1, 'cs_test_mock_session_102', 99.00, '1,000 PokéGemas', 'completed', 'ash@correo.com'),
      ($2, 'cs_test_mock_session_103', 249.00, '3,000 PokéGemas', 'completed', 'misty@correo.com'),
      ($3, 'cs_test_mock_session_104', 149.00, 'Pase de Batalla Premium', 'completed', 'dawn@correo.com')
    `, [ashId, mistyId, dawnId]);
    console.log('✅ Historial de pagos de Stripe inicializado.');

    console.log('🎉 BASE DE DATOS INICIALIZADA EXITOSAMENTE 🎉');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
