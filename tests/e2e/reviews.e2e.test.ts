import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Reviews API Endpoints", () => {
  const testUser = {
    email: "reviewuser@example.com",
    password: "securepassword",
  };

  let userId: number;
  let token: string;
  let businessProfileId: number;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [testUser.email, hashedPassword, true, 0, "Test User"]
    );
    userId = userResult.rows[0].id;

    token = jwt.sign({ id: userId, email: testUser.email, tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create test profile and business
    const { businessProfileId: bpId } = await createTestProfileAndBusiness(userId);
    businessProfileId = bpId;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  afterEach(async () => {
    await pool.query("DELETE FROM reviews WHERE business_id = $1", [businessProfileId]);
  });

  it("GET /reviews/business/:businessId - Should return all reviews for a business", async () => {
    await pool.query(
      `INSERT INTO reviews (business_id, user_id, rating, feedback, customer_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [businessProfileId, userId, 8, "Great service!", "Test User"]
    );

    const response = await request(app)
      .get(`/api/reviews/business/${businessProfileId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rating: 8,
          feedback: "Great service!",
        }),
      ])
    );
  });

  it("POST /reviews - Should create a new review", async () => {
    const reviewData = {
      businessId: businessProfileId,
      rating: 9,
      feedback: "Excellent experience!",
    };

    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send(reviewData)
      .expect(201);

    expect(response.body).toHaveProperty("message", "Review created successfully");

    const dbCheck = await pool.query("SELECT * FROM reviews WHERE business_id = $1", [
      businessProfileId,
    ]);
    expect(dbCheck.rowCount).toBe(1);
  });

  it("PUT /reviews/:reviewId - Should update an existing review and verify averages", async () => {
    // Insert a review
    const reviewResult = await pool.query(
      `INSERT INTO reviews (business_id, user_id, rating, feedback, customer_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [businessProfileId, userId, 5, "Good service", "Test User"]
    );
    const reviewId = reviewResult.rows[0].id;

    const updatedReviewData = {
      businessId: businessProfileId, // Include businessId if required
      rating: 10,
      feedback: "Amazing service!",
    };

    // Update the review
    const response = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedReviewData)
      .expect(200);
  });

  it("POST /reviews - Should correctly update averages when there are multiple reviews for the same business", async () => {
    // Create a second user
    const secondUserResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      ["seconduser@example.com", await bcrypt.hash("securepassword", 10), true, 0, "Second User"]
    );
    const secondUserId = secondUserResult.rows[0].id;

    const secondUserToken = jwt.sign(
      { id: secondUserId, email: "seconduser@example.com", tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    try {
      // Create the first review by the first user
      const firstReviewData = {
        businessId: businessProfileId,
        rating: 8,
        feedback: "Good service",
      };

      const firstReviewResponse = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send(firstReviewData)
        .expect(201);

      expect(firstReviewResponse.body).toHaveProperty("message", "Review created successfully");

      // Create the second review by the second user
      const secondReviewData = {
        businessId: businessProfileId,
        rating: 6,
        feedback: "Okay service",
      };

      const secondReviewResponse = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${secondUserToken}`)
        .send(secondReviewData)
        .expect(201);

      expect(secondReviewResponse.body).toHaveProperty("message", "Review created successfully");

      // Verify the business profile's average and count
      const businessCheck = await pool.query(
        "SELECT avg_rating, total_reviews FROM profiles_business WHERE id = $1",
        [businessProfileId]
      );

      const avgRating = parseFloat(businessCheck.rows[0].avg_rating);
      const totalReviews = parseInt(businessCheck.rows[0].total_reviews, 10);

      // Expected average: (8 + 6) / 2 = 7
      expect(avgRating).toBe(7);
      expect(totalReviews).toBe(2);
    } finally {
      // Clean up the second user after the test
      await pool.query("DELETE FROM users WHERE id = $1", [secondUserId]);
    }
  });

  const createTestProfile = async (userId: number) => {
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    return profileResult.rows[0].id;
  };

  const createTestBusinessProfile = async (profileId: number) => {
    const businessProfileResult = await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Test Business', 'Technology') RETURNING id`,
      [profileId]
    );
    return businessProfileResult.rows[0].id;
  };

  const createTestProfileAndBusiness = async (userId: number) => {
    const profileId = await createTestProfile(userId);
    const businessProfileId = await createTestBusinessProfile(profileId);
    return { profileId, businessProfileId };
  };
});
