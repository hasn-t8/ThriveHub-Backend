import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS policies (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type_id INTEGER REFERENCES user_types(id) ON DELETE CASCADE,
      effect VARCHAR(10) NOT NULL CHECK (effect IN ('Allow', 'Deny')),
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
