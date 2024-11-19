import pool from '../config/db';

export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
}

export const findUserByUsername = async (username: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
};

export const createUser = async (username: string, password: string, role: string): Promise<void> => {
  await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [
    username,
    password,
    role,
  ]);
};
