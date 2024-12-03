import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Business Profile Views E2E Test", () => {
  const testUser = {
    email: "businessviewuser@example.com",
    password: "securepassword",
  };

  let userId: number;
  let profileId: number;
  let token: string;

  beforeAll(async () => {
    // Create a test user and generate a JWT
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [testUser.email, hashedPassword, true, 0]
    );

    userId = userResult.rows[0].id;
    token = jwt.sign(
      { id: userId, email: testUser.email, tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Create a business profile for the user
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    profileId = profileResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, views) VALUES ($1, 'Test Organization', 0)`,
      [profileId]
    );
  });

  afterEach(async () => {
    // Reset the views count after each test
    await pool.query(`UPDATE profiles_business SET views = 0 WHERE profile_id = $1`, [profileId]);
  });

  afterAll(async () => {
    // Clean up the test data and close the database connection
    await pool.query("DELETE FROM profiles_business WHERE profile_id = $1", [profileId]);
    await pool.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  it("should increment the view count of a business profile", async () => {
    // Increment the view count
    const incrementResponse = await request(app)
      .post(`/api/analytics/profile-business/${profileId}/view`)
      .expect(200);

    expect(incrementResponse.body.message).toBe("View count incremented");
    expect(incrementResponse.body.views).toBe(1);

    // Increment the view count again
    const secondIncrementResponse = await request(app)
      .post(`/api/analytics/profile-business/${profileId}/view`)
      .expect(200);

    expect(secondIncrementResponse.body.message).toBe("View count incremented");
    expect(secondIncrementResponse.body.views).toBe(2);
  });

  it("should retrieve the view count of a business profile", async () => {
    // Increment the view count twice
    await request(app).post(`/api/analytics/profile-business/${profileId}/view`).expect(200);
    await request(app).post(`/api/analytics/profile-business/${profileId}/view`).expect(200);

    // Retrieve the view count
    const response = await request(app)
      .get(`/api/analytics/profile-business/${profileId}/views`)
      .expect(200);

    expect(response.body.views).toBe(2);
  });

  it("should return 404 when trying to increment views for a non-existent profile", async () => {
    const response = await request(app)
      .post(`/api/analytics/profile-business/99999/view`) // Non-existent profile ID
      .expect(404);

    expect(response.body.error).toBe("Business profile not found");
  });

  it("should return 404 when trying to get views for a non-existent profile", async () => {
    const response = await request(app)
      .get(`/api/analytics/profile-business/99999/views`) // Non-existent profile ID
      .expect(404);

    expect(response.body.error).toBe("Business profile not found");
  });
});
