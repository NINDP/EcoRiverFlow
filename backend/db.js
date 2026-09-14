const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'ecoriver',
  user: process.env.DB_USER || 'ecoriver_user',
  password: process.env.DB_PASSWORD || 'ecoriver_12345'
});

module.exports = pool;