import pool from "../config/db";

export interface Share {
  id: number;
  review_id: number;
  user_id: number | null;
  shared_at: Date;
}

/**
 * Log a share event.
 * @param reviewId The ID of the shared review
 * @param userId The ID of the user sharing the review (optional)
 * @returns The newly created share entry
 */
export const addShare = async (
  reviewId: number,
  userId: number | null
): Promise<Share> => {
  const result = await pool.query(
    `INSERT INTO shares (review_id, user_id)
     VALUES ($1, $2)
     RETURNING id, review_id, user_id, shared_at`,
    [reviewId, userId]
  );

  return result.rows[0];
};

/**
 * Get share count for a review.
 * @param reviewId The ID of the review
 * @returns The count of shares for the review
 */
export const getShareCountForReview = async (
  reviewId: number
): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) AS share_count
     FROM shares
     WHERE review_id = $1`,
    [reviewId]
  );

  return parseInt(result.rows[0].share_count, 10);
};

/**
 * Get all shares for a review.
 * @param reviewId The ID of the review
 * @returns A list of shares
 */
export const getSharesForReview = async (
  reviewId: number
): Promise<Share[]> => {
  const result = await pool.query(
    `SELECT id, review_id, user_id, shared_at
     FROM shares
     WHERE review_id = $1
     ORDER BY shared_at ASC`,
    [reviewId]
  );

  return result.rows;
};
