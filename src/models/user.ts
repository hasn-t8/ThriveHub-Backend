import pool from '../config/db';

export interface User {
  id: string;
  email: string;
  password: string;
  is_active: boolean;
  token_version: number;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

export const createUser = async (email: string, password: string): Promise<void> => {
  await pool.query(
    'INSERT INTO users (email, password) VALUES ($1, $2)',
    [email, password]
  );
};

export const activateUser = async (email: string): Promise<void> => {
  await pool.query('UPDATE users SET is_active = true WHERE email = $1', [email]);
};

export const deactivateUser = async (email: string): Promise<void> => {
  await pool.query('UPDATE users SET is_active = false WHERE email = $1', [email]);
};
