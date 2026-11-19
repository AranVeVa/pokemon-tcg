const { Pool } = require('pg');
const { DB_CONFIG } = require('../config');

const pool = new Pool(DB_CONFIG);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
