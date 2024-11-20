import { Pool } from 'pg';

export const up = async (pool: Pool): Promise<void> => {
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      token_version INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);

  // Create user_types table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_types (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) UNIQUE NOT NULL
    );
  `);

  // Create user_user_types mapping table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_user_types (
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type_id INT REFERENCES user_types(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, type_id)
    );
  `);

  // Create policies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS policies (
      id SERIAL PRIMARY KEY,
      type_id INT REFERENCES user_types(id) ON DELETE CASCADE,
      effect VARCHAR(10) NOT NULL CHECK (effect IN ('Allow', 'Deny')),
      actions TEXT[] NOT NULL,
      resources TEXT[] NOT NULL
    );
  `);
};

export const down = async (pool: Pool): Promise<void> => {
  await pool.query(`DROP TABLE IF EXISTS policies;`);
  await pool.query(`DROP TABLE IF EXISTS user_user_types;`);
  await pool.query(`DROP TABLE IF EXISTS user_types;`);
  await pool.query(`DROP TABLE IF EXISTS users;`);
};
