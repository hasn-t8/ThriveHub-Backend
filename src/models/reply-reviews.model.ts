import pool from "../config/db";

export interface ReviewReply {
  id: number;
  review_id: number;
  business_id: number;
  reply: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Add a reply to a review.
 * @param reviewId The review ID being replied to
 * @param businessId The ID of the business replying
 * @param reply The reply text
 * @returns The newly created reply
 */
export const addReviewReply = async (
  reviewId: number,
  businessId: number,
  reply: string
): Promise<ReviewReply> => {
  const result = await pool.query(
    `INSERT INTO review_replies (review_id, business_id, reply)
     VALUES ($1, $2, $3)
     RETURNING id, review_id, business_id, reply, created_at, updated_at`,
    [reviewId, businessId, reply]
  );

  return result.rows[0];
};

/**
 * Update a reply to a review.
 * @param replyId The ID of the reply
 * @param reply The updated reply text
 * @returns The updated reply
 */
export const updateReviewReply = async (
  replyId: number,
  reply: string
): Promise<ReviewReply | null> => {
  const result = await pool.query(
    `UPDATE review_replies
     SET reply = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, review_id, business_id, reply, created_at, updated_at`,
    [reply, replyId]
  );

  if (result.rowCount === 0) {
    return null; // No reply found with the given ID
  }

  return result.rows[0];
};

/**
 * Delete a reply by its ID.
 * @param replyId The ID of the reply to delete
 */
export const deleteReviewReply = async (replyId: number): Promise<void> => {
  await pool.query(
    `DELETE FROM review_replies WHERE id = $1`,
    [replyId]
  );
};

/**
 * Get all replies for a specific review.
 * @param reviewId The ID of the review
 * @returns A list of replies for the review
 */
export const getRepliesForReview = async (
    reviewId: number
  ): Promise<ReviewReply[]> => {
    try {
      const result = await pool.query(
        `SELECT id, review_id, business_id, reply, created_at, updated_at
         FROM review_replies
         WHERE review_id = $1
         ORDER BY created_at ASC`,
        [reviewId]
      );
  
      if (result.rowCount === 0) {
        console.log(`No replies found for review_id: ${reviewId}`);
      }
  
      return result.rows;
    } catch (error) {
      console.error(`Error fetching replies for review_id: ${reviewId}`, error);
      throw error;
    }
  };
  

/**
 * Get all replies left by a specific business.
 * @param businessId The business ID
 * @returns A list of replies
 */
export const getRepliesByBusiness = async (
  businessId: number
): Promise<ReviewReply[]> => {
  const result = await pool.query(
    `SELECT id, review_id, business_id, reply, created_at, updated_at
     FROM review_replies
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [businessId]
  );

  return result.rows;
};

/**
 * Get a reply by its ID.
 * @param replyId The ID of the reply
 * @returns The reply details or null if not found
 */
export const getReplyById = async (
  replyId: number
): Promise<ReviewReply | null> => {
  const result = await pool.query(
    `SELECT id, review_id, business_id, reply, created_at, updated_at
     FROM review_replies
     WHERE id = $1`,
    [replyId]
  );

  if (result.rowCount === 0) {
    return null; // Return null if reply not found
  }

  return result.rows[0]; // Return the reply details
};
