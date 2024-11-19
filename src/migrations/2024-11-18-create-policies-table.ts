import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS policies (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) REFERENCES users(username),
      effect VARCHAR(10) NOT NULL,
      actions JSONB NOT NULL,
      resources JSONB NOT NULL
    );
  `);
};

export const down = async (pool: Pool) => {
  await pool.query(`DROP TABLE IF EXISTS policies;`);
};
