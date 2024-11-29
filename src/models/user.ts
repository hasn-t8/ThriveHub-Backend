import pool from "../config/db";
import bcrypt from "bcrypt";

export interface User {
  id: number;
  email: string;
  password: string;
  is_active: boolean;
  token_version: number;
  full_name: string;
  created_at: Date;
  updated_at: Date;
}

/** --------------------- Find User By Email --------------------- */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0] || null;
};

/** --------------------- Find User By ID --------------------- */
export const findUserById = async (userId: number): Promise<User | null> => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0] || null;
};

/** --------------------- Create User --------------------- */
export const createUser = async (
  email: string,
  password: string,
  full_name: string
): Promise<number> => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password, token_version, is_active, full_name) 
     VALUES ($1, $2, 0, true, $3) RETURNING id`,
    [email, hashedPassword, full_name]
  );
  return result.rows[0].id;
};

/** --------------------- Assign User Types --------------------- */
export const assignUserTypes = async (
  userId: number,
  types: string[]
): Promise<void> => {
  for (const type of types) {
    const typeResult = await pool.query(
      "SELECT id FROM user_types WHERE type = $1",
      [type]
    );
    if (typeResult.rowCount === 0) {
      throw new Error(`User type "${type}" does not exist.`);
    }

    const typeId = typeResult.rows[0].id;

    await pool.query(
      "INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2)",
      [userId, typeId]
    );
  }
};

/** --------------------- Account Activation --------------------- */
export const activateUser = async (email: string): Promise<void> => {
  await pool.query("UPDATE users SET is_active = true WHERE email = $1", [
    email,
  ]);
};

/** --------------------- Account De-Activation --------------------- */
export const deactivateUser = async (email: string): Promise<void> => {
  await pool.query("UPDATE users SET is_active = false WHERE email = $1", [
    email,
  ]);
};

/** --------------------- Account Verification --------------------- */
export const saveVerificationCode = async (
  userId: number,
  code: number
): Promise<void> => {
  await pool.query(
    `
    INSERT INTO user_verification (user_id, code) 
    VALUES ($1, $2) 
    ON CONFLICT (user_id) 
    DO UPDATE SET code = $2
    `,
    [userId, code]
  );
};

/** --------------------- Password Reset - save token --------------------- */
export const saveResetToken = async (
  userId: number,
  resetToken: string
): Promise<void> => {
  await pool.query(
    `INSERT INTO password_resets (user_id, token, created_at) VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET token = $2, created_at = NOW()`,
    [userId, resetToken]
  );
};

/** --------------------- Change Password --------------------- */
export const updatePassword = async (
  userId: number,
  hashedPassword: string
): Promise<void> => {
  await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
    hashedPassword,
    userId,
  ]);
};
