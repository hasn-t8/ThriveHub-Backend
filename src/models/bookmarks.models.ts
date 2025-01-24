import pool from "../config/db";

export interface Bookmark {
  id: number;
  user_id: number;
  business_id: number;
  created_at: Date;
}

/**
 * Check if a business is bookmarked by a user.
 * @param userId The user ID
 * @param businessId The business ID
 * @returns True if bookmarked, false otherwise
 */
export const isBookmarked = async (
  userId: number,
  businessId: number
): Promise<boolean> => {
  try {
    const result = await pool.query(
      `SELECT 1
       FROM bookmarks
       WHERE user_id = $1 AND business_id = $2`,
      [userId, businessId]
    );

    // Safely handle result.rowCount
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error checking if bookmarked:", (error as Error).message);
    throw error; // Rethrow to ensure the error propagates
  }
};

/**
 * Add a bookmark for a user and business.
 * @param userId The user ID
 * @param businessId The business ID
 * @returns The newly created bookmark
 */
export const addBookmark = async (
  userId: number,
  businessId: number
): Promise<Bookmark> => {
  try {
    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, business_id)
       VALUES ($1, $2)
       RETURNING id, user_id, business_id, created_at`,
      [userId, businessId]
    );

    if (!result.rows[0]) {
      throw new Error("Failed to create a bookmark.");
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error adding bookmark:", (error as Error).message);
    throw error;
  }
};

/**
 * Remove a bookmark for a user and business.
 * @param userId The user ID
 * @param businessId The business ID
 */
export const removeBookmark = async (
  userId: number,
  businessId: number
): Promise<void> => {
  try {
    const result = await pool.query(
      `DELETE FROM bookmarks
       WHERE user_id = $1 AND business_id = $2`,
      [userId, businessId]
    );

    if (result.rowCount === 0) {
      throw new Error(
        `No bookmark found to delete for user_id=${userId} and business_id=${businessId}.`
      );
    }
  } catch (error) {
    console.error("Error removing bookmark:", (error as Error).message);
    throw error;
  }
};
