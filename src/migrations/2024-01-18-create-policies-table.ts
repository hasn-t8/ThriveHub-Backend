import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS policies (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
      effect VARCHAR(10) NOT NULL,
      actions JSONB NOT NULL,
      resources JSONB NOT NULL
    );
  `);

  console.log('Table "policies" created successfully.');
};

export const down = async (pool: Pool) => {
  await pool.query(`DROP TABLE IF EXISTS policies;`);
  console.log('Table "policies" dropped successfully.');
};
