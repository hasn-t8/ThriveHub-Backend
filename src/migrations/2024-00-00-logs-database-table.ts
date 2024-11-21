import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs_database (
      id SERIAL PRIMARY KEY,
      action VARCHAR(50) NOT NULL, -- 'apply' or 'rollback'
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

export const down = async (pool: Pool) => {
  await pool.query(`DROP TABLE IF EXISTS logs_database;`);
};
