import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_user_types (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type_id INTEGER REFERENCES user_types(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, type_id)
    );
  `);
  console.log('Table "user_user_types" created successfully.');
};

export const down = async (pool: Pool) => {
  await pool.query('DROP TABLE IF EXISTS user_user_types;');
  console.log('Table "user_user_types" dropped successfully.');
};
