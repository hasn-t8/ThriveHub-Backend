import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_verification (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code INT NOT NULL
    );
  `);
};

export const down = async (pool: Pool) => {
  await pool.query('DROP TABLE IF EXISTS user_verification;');
};
