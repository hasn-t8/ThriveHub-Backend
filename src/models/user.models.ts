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
export const findUserByEmail = async (email: string): Promise<User & { userTypes: string[] } | null> => {
  const result = await pool.query(
    `
    SELECT 
      u.*,
      COALESCE(json_agg(ut.type) FILTER (WHERE ut.type IS NOT NULL), '[]') AS user_types
    FROM 
      users u
    LEFT JOIN 
      user_user_types uut ON u.id = uut.user_id
    LEFT JOIN 
      user_types ut ON uut.type_id = ut.id
    WHERE 
      u.email = $1
    GROUP BY 
      u.id
    `,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  return {
    ...user,
    userTypes: user.user_types,
  };
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


/**
 * Updates the full_name in the users table for a given user ID.
 * @param userId The user ID
 * @param fullName The new full name
 */
export async function updateUserFullName(userId: number, fullName: string): Promise<void> {
  const query = `
    UPDATE users
    SET full_name = $1
    WHERE id = $2
  `;
  
  try {
    await pool.query(query, [fullName, userId]);
    console.log(`User full name updated to: ${fullName} for userId: ${userId}`);
  } catch (error) {
    console.error("Error updating user full name:", error);
    throw error;
  }
}

/** --------------------- Delete User --------------------- */
export const deleteUser = async (userId: number): Promise<void> => {
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [
      userId,
    ]);
    
    if (result.rowCount === 0) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    console.log(`User with ID ${userId} has been deleted.`);
  } catch (error) {
    if (error instanceof Error) {
      // Handle the error with a meaningful message
      console.error(`Error deleting user with ID ${userId}:`, error.message);
      throw new Error(`Error deleting user: ${error.message}`);
    } else {
      // Handle unexpected errors
      console.error(`Unexpected error deleting user with ID ${userId}:`, error);
      throw new Error("An unexpected error occurred while deleting the user.");
    }
  }
};
