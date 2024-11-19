import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL
    );
  `);
};

export const down = async (pool: Pool) => {
  await pool.query(`DROP TABLE IF EXISTS users;`);
};
