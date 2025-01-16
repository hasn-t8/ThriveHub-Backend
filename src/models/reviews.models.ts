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
  approval_status: boolean;
  // location: string; // Added location
}


/**
 * Update the total likes for a review.
 * @param reviewId The review ID
 */
export const updateReviewLikes = async (reviewId: number): Promise<void> => {
  await pool.query(
    `
      UPDATE reviews
      SET likes_total = (
        SELECT COUNT(*)
        FROM likes
        WHERE entity_type = 'reviews' AND entity_id = $1
      )
      WHERE id = $1
      `,
    [reviewId]
  );
};

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
  const userResult = await pool.query(`SELECT full_name FROM users WHERE id = $1`, [userId]);
  if (userResult.rowCount === 0) {
    throw new Error("User not found");
  }

  const customerName = userResult.rows[0].full_name || "Anonymous";

  const result = await pool.query(
    `INSERT INTO reviews (business_id, user_id, rating, feedback, customer_name, approval_status)
     VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
    [businessId, userId, rating, feedback, customerName]
  );

  // Update business profile ratings
  await updateBusinessRatings(businessId);

  return result.rows[0].id;
};

/**
 * Update the average rating and total reviews for a business.
 * @param businessId The business ID
 */
export const updateBusinessRatings = async (businessId: number): Promise<void> => {
  const result = await pool.query(
    `SELECT AVG(rating)::NUMERIC(10,0) AS avg_rating, COUNT(*) AS total_reviews
     FROM reviews
     WHERE business_id = $1`,
    [businessId]
  );

  const { avg_rating, total_reviews } = result.rows[0];

  await pool.query(
    `UPDATE profiles_business
     SET avg_rating = $1, total_reviews = $2
     WHERE id = $3`,
    [avg_rating || 0, total_reviews || 0, businessId]
  );
};


/**
 * Approve a review by ID.
 * @param reviewId The review ID
 * @returns The approved review or null if not found
 */
export const approveReview = async (reviewId: number): Promise<Review | null> => {
  const result = await pool.query(
    `
    UPDATE reviews 
    SET approval_status = TRUE, updated_at = NOW()
    WHERE id = $1
    RETURNING id, business_id, user_id, rating, feedback, approval_status, created_at, updated_at
    `,
    [reviewId]
  );

  if (result.rowCount === 0) {
    return null; // No review found with the given ID
  }

  return result.rows[0]; // Return the approved review
};


/**
 * Update an existing review.
 * @param reviewId The review ID
 * @param userId The ID of the user updating the review
 * @param rating The new rating
 * @param feedback The new feedback text
 * @returns The updated review
 */

export const updateReview = async (
reviewId: number, userId: number, rating?: number, feedback?: string, p0?: string): Promise<Review | null> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check ownership and existence of the review
    const reviewResult = await client.query(
      `SELECT business_id FROM reviews WHERE id = $1 AND user_id = $2`,
      [reviewId, userId]
    );

    if (reviewResult.rowCount === 0) {
      throw new Error("Review not found or unauthorized");
    }

    const businessId = reviewResult.rows[0].business_id;

    // Update the review and set approval_status to "false"
    const updatedReviewResult = await client.query(
      `
      UPDATE reviews
      SET 
        rating = COALESCE($1, rating),
        feedback = COALESCE($2, feedback),
        approval_status = 'false', -- Set approval_status to pending
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, business_id, user_id, rating, feedback, customer_name, created_at, updated_at, approval_status
      `,
      [rating, feedback, reviewId]
    );

    const updatedReview = updatedReviewResult.rows[0];

    await client.query("COMMIT");
    return updatedReview;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating review:", error);
    throw error;
  } finally {
    client.release();
  }
};


/**
 * Get all recent reviews with the highest rating, including the organization name.
 * @param {number} [limit=10] - The maximum number of reviews to retrieve (optional).
 * @returns A list of recent reviews with the highest rating.
 */
export const getRecentHighestRatedReviews = async (limit = 10): Promise<Review[]> => {
  const result = await pool.query(
    `
    SELECT 
      r.id, 
      r.business_id, 
      r.user_id, 
      r.rating, 
      r.feedback, 
      r.created_at, 
      r.updated_at, 
      r.customer_name, 
      r.approval_status,
      pb.org_name
    FROM reviews r
    LEFT JOIN profiles_business pb ON r.business_id = pb.id
    WHERE r.rating = (SELECT MAX(rating) FROM reviews)
    ORDER BY r.created_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};
/**
 * Get all reviews in the system, including the user's location.
 * @returns A list of all reviews
 */
export const getAllReviews = async (): Promise<Review[]> => {
  const result = await pool.query(
    `
    SELECT r.id, r.business_id, r.user_id, r.rating, r.feedback, r.created_at, r.updated_at, 
           r.customer_name, r.approval_status, pp.address_city
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
    ORDER BY r.created_at DESC
    `
  );

  return result.rows;
};


/**
 * Check if the user is the owner of the review.
 * @param reviewId The review ID
 * @param userId The user ID
 * @returns True if the user is the owner, otherwise false
 */
export const checkReviewOwnership = async (reviewId: number, userId: number): Promise<boolean> => {
  const result = await pool.query(`SELECT user_id FROM reviews WHERE id = $1`, [reviewId]);

  if (result.rowCount === 0) {
    throw new Error("Review not found");
  }

  return result.rows[0].user_id === userId;
};

/**
 * Delete a review by its ID.
 * @param reviewId The review ID
 */
export const deleteReview = async (reviewId: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reviewResult = await client.query(`SELECT business_id FROM reviews WHERE id = $1`, [
      reviewId,
    ]);

    if (reviewResult.rowCount === 0) {
      throw new Error("Review not found");
    }

    const businessId = reviewResult.rows[0].business_id;

    await client.query(`DELETE FROM reviews WHERE id = $1`, [reviewId]);

    // Update business profile ratings
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
 * Get reviews by their approval status, including the user's location.
 * @param approvalStatus The approval status (true for approved, false for pending/denied).
 * @returns A list of reviews matching the specified approval status
 */
export const getReviewsByApprovalStatus = async (
  approvalStatus: boolean
): Promise<Review[]> => {
  try {
    const result = await pool.query(
      `
      SELECT r.id, r.business_id, r.user_id, r.rating, r.feedback, r.created_at, r.updated_at, 
             r.customer_name, r.approval_status, pp.address_city
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
      WHERE r.approval_status = $1
      ORDER BY r.created_at DESC
      `,
      [approvalStatus] // Ensure this parameter is correctly passed
    );

    return result.rows;
  } catch (error) {
    console.error("Error fetching reviews by approval status:", error);
    throw error;
  }
};

/**
 * Get all reviews left by a specific user, including the user's location.
 * @param userId The user ID
 * @returns A list of reviews
 */
export const getReviewsByUserId = async (userId: number): Promise<Review[]> => {
  try {
    const result = await pool.query(
      `
      SELECT r.id, r.business_id, r.user_id, r.rating, r.feedback, r.created_at, r.updated_at, 
             r.customer_name, r.approval_status, pp.address_city
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      `,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error fetching reviews by user ID:", error);
    throw error;
  }
};

/**
 * Get a review by its ID, including the user's location.
 * @param reviewId The review ID
 * @returns The review details or null if not found
 */
export const getReviewById = async (reviewId: number): Promise<Review | null> => {
  try {
    const result = await pool.query(
      `
      SELECT r.id, r.business_id, r.user_id, r.rating, r.feedback, r.created_at, r.updated_at, 
             r.customer_name, r.approval_status, pp.address_city
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
      WHERE r.id = $1
      `,
      [reviewId]
    );

    if (result.rowCount === 0) {
      return null; // Return null if review not found
    }

    return result.rows[0]; // Return the review details
  } catch (error) {
    console.error("Error fetching review by ID:", error);
    throw error;
  }
};

/**
 * Get all reviews for a specific business, including the user's location.
 * @param businessId The business ID
 * @returns A list of reviews
 */
export const getReviewsForBusiness = async (businessId: number): Promise<Review[]> => {
  try {
    const result = await pool.query(
      `
      SELECT r.id, r.business_id, r.user_id, r.rating, r.feedback, r.created_at, r.updated_at, 
             r.customer_name, r.approval_status, pp.address_city
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
      WHERE r.business_id = $1
      ORDER BY r.created_at DESC
      `,
      [businessId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error fetching reviews for business:", error);
    throw error;
  }
};

/**
 * Search reviews by a query string, including the user's location.
 * @param query The search query
 * @param limit The number of results to return (optional)
 * @returns A list of reviews matching the query
 */
export const searchReviews = async (query: string, limit: number = 10): Promise<Review[]> => {
  try {
    const result = await pool.query(
      `
      SELECT r.id, r.business_id, r.user_id, r.rating, r.feedback, r.created_at, r.updated_at, 
             r.customer_name, r.approval_status, pp.address_city
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
      WHERE 
        r.feedback ILIKE $1 OR
        r.customer_name ILIKE $1 OR
        r.business_id IN (SELECT id FROM profiles_business WHERE org_name ILIKE $1)
      ORDER BY r.created_at DESC
      LIMIT $2
      `,
      [`%${query}%`, limit]
    );

    return result.rows;
  } catch (error) {
    console.error("Error searching reviews:", error);
    throw error;
  }
};
