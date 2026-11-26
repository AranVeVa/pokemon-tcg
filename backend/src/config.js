require('dotenv').config();

// config.js
// Modo demo: 4 minutos, en producción: 4 horas (240 minutos)
const MODO_DEMO = process.env.MODO_DEMO === 'false' ? false : true; // cambiar a false para producción
const INTERVALO_SOBRE_MIN = MODO_DEMO ? 4 : 240;

// config.js
// Soporte híbrido: Neon Serverless PostgreSQL (DATABASE_URL con SSL) o Localhost PostgreSQL
const DB_CONFIG = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '0408',
      database: process.env.DB_NAME || 'pokemon_tcg',
    };

module.exports = {
  MODO_DEMO,
  INTERVALO_SOBRE_MIN,
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_pokemon_tcg_jwt_key_2026',
  DB_CONFIG,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_demo',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};
