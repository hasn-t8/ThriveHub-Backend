import pool from '../config/db';

export interface User {
  id: string;
  email: string;
  password: string;
  is_active: boolean;
  token_version: number;
}

// Find a user by email
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

// Create a new user and return their ID
export const createUser = async (email: string, password: string): Promise<number> => {
  const result = await pool.query(
    'INSERT INTO users (email, password, token_version, is_active) VALUES ($1, $2, 0, true) RETURNING id',
    [email, password]
  );
  return result.rows[0].id; // Return the new user's ID
};

// Assign user types to a user
export const assignUserTypes = async (userId: number, types: string[]): Promise<void> => {
  for (const type of types) {
    const typeResult = await pool.query('SELECT id FROM user_types WHERE type = $1', [type]);
    if (typeResult.rowCount === 0) {
      throw new Error(`User type "${type}" does not exist.`);
    }

    const typeId = typeResult.rows[0].id;

    await pool.query('INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2)', [userId, typeId]);
  }
  console.log(`User ${userId} assigned to types: ${types.join(', ')}`);
};

// Activate a user
export const activateUser = async (email: string): Promise<void> => {
  await pool.query('UPDATE users SET is_active = true WHERE email = $1', [email]);
};

// Deactivate a user
export const deactivateUser = async (email: string): Promise<void> => {
  await pool.query('UPDATE users SET is_active = false WHERE email = $1', [email]);
};
