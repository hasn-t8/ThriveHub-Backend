import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_types (
      id SERIAL PRIMARY KEY,
      type VARCHAR(255) UNIQUE NOT NULL
    );
  `);
};

export const down = async (pool: Pool) => {
  await pool.query(`DROP TABLE IF EXISTS user_types;`);
  console.log('Table "user_types" dropped successfully.');
};
