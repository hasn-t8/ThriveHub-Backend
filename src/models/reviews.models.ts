import pool from "../config/db";

export interface Review {
  id: number;
  business_id: number;
  user_id: number;
  rating: number;
  feedback: string;
  created_at: Date;
  updated_at: Date;
  customer_name: string;
}

/**
 * Create a new review for a business.
 * @param businessId The business ID
 * @param userId The user ID
 * @param rating The rating given (1-10)
 * @param feedback The feedback text
 * @returns The ID of the newly created review
 */
export const createReview = async (
  businessId: number,
  userId: number,
  rating: number,
  feedback: string
): Promise<number> => {
  const userResult = await pool.query(
    `SELECT full_name FROM users WHERE id = $1`,
    [userId]
  );
  if (userResult.rowCount === 0) {
    throw new Error("User not found");
  }

  const customerName = userResult.rows[0].full_name;

  const result = await pool.query(
    `INSERT INTO reviews (business_id, user_id, rating, feedback, customer_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [businessId, userId, rating, feedback, customerName]
  );

  await updateBusinessRatings(businessId);

  return result.rows[0].id;
};


/**
 * Update the average rating and total reviews for a business.
 * @param businessId The business ID
 */
export const updateBusinessRatings = async (
  businessId: number
): Promise<void> => {
  const result = await pool.query(
    `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews
     FROM reviews
     WHERE business_id = $1`,
    [businessId]
  );

  const { avg_rating, total_reviews } = result.rows[0];

  await pool.query(
    `UPDATE profiles_business
     SET avg_rating = $1, total_reviews = $2
     WHERE id = $3`,
    [avg_rating, total_reviews, businessId]
  );
};

/**
 * Get all reviews for a specific business.
 * @param businessId The business ID
 * @returns A list of reviews
 */
export const getReviewsForBusiness = async (
  businessId: number
): Promise<Review[]> => {
  const result = await pool.query(
    `SELECT id, business_id, user_id, rating, feedback, created_at, customer_name
     FROM reviews
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [businessId]
  );

  return result.rows;
};

/**
 * Delete a review by its ID.
 * @param reviewId The review ID
 */
export const deleteReview = async (reviewId: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reviewResult = await client.query(
      `SELECT business_id FROM reviews WHERE id = $1`,
      [reviewId]
    );

    if (reviewResult.rowCount === 0) {
      throw new Error("Review not found");
    }

    const businessId = reviewResult.rows[0].business_id;

    await client.query(`DELETE FROM reviews WHERE id = $1`, [reviewId]);

    await updateBusinessRatings(businessId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all reviews left by a specific user.
 * @param userId The user ID
 * @returns A list of reviews
 */
export const getReviewsByUserId = async (userId: number): Promise<Review[]> => {
  const result = await pool.query(
    `SELECT id, business_id, user_id, rating, feedback, created_at, customer_name
     FROM reviews
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};
