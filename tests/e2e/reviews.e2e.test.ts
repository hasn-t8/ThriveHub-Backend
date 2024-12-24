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
