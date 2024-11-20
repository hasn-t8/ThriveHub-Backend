import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      token_version INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true
    );
  `);
  console.log('Table "users" created successfully.');
};

export const down = async (pool: Pool) => {
  await pool.query(`DROP TABLE IF EXISTS users;`);
  console.log('Table "users" dropped successfully.');
};
