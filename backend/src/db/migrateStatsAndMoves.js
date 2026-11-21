const { pool } = require('./index');
const { generateMovesForPokemon } = require('../data/movesList');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('--- Ejecutando migración de Stats, Movimientos y Resend ---');
    await client.query('BEGIN');

    // 1. Agregar columnas a user_cards
    await client.query(`
      ALTER TABLE user_cards 
      ADD COLUMN IF NOT EXISTS def INT DEFAULT 50,
      ADD COLUMN IF NOT EXISTS spd INT DEFAULT 50,
      ADD COLUMN IF NOT EXISTS iv_percentage INT DEFAULT 85,
      ADD COLUMN IF NOT EXISTS moves JSONB;
    `);

    // 2. Agregar columnas a users para recuperación de contraseña
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;
    `);

    // 3. Poblar estadísticas y ataques variados para todas las cartas existentes de los usuarios
    const existingCards = await client.query(`
      SELECT uc.id, uc.card_id, uc.level, uc.max_hp, uc.atk, pc.name, pc.types, pc.hp_base, pc.atk_base
      FROM user_cards uc
      JOIN pokemon_cards pc ON uc.card_id = pc.id
      WHERE uc.moves IS NULL OR uc.def IS NULL
    `);

    console.log(`Enriqueciendo ${existingCards.rows.length} cartas existentes con ataques variados y stats...`);

    for (const card of existingCards.rows) {
      // Generar movimientos y stats tipo Pokémon GO
      const moves = generateMovesForPokemon(card.types, card.name);
      
      // IV aleatorio entre 70% y 100% (como valoración de estrellas en Pokémon GO)
      const iv = Math.floor(70 + Math.random() * 31);
      
      // Stats basadas en base stats + nivel + IV
      const def = Math.round(card.atk_base * 0.85 * (1 + (card.level - 1) * 0.20) * (iv / 100));
      const spd = Math.round((card.hp_base + card.atk_base) * 0.5 * (iv / 100));

      await client.query(`
        UPDATE user_cards 
        SET def = $1, spd = $2, iv_percentage = $3, moves = $4
        WHERE id = $5
      `, [def, spd, iv, JSON.stringify(moves), card.id]);
    }

    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
