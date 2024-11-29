import request from "supertest";
import app from "../../src/app"; // Your Express app
import bcrypt from "bcrypt";
import pool from "../../src/config/db"; // Your database connection
import jwt from "jsonwebtoken";

describe("Profile Creation E2E Test", () => {
  const testUser = {
    email: "testuser4profileTest@example.com",
    password: "password123",
    full_name: "Test User",
  };

  let userId: number; // Store the user ID for cleanup and testing
  let token: string; // Store the JWT for authenticated requests

  beforeAll(async () => {
    // Insert a test user into the database
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [testUser.email, hashedPassword, true, 0, testUser.full_name]
    );
    userId = result.rows[0].id;

    // Generate a JWT for the test user
    token = jwt.sign(
      { id: userId, email: testUser.email, tokenVersion: 0 },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "3m",
      }
    );
  });

  afterAll(async () => {
    if (userId) {
      // Clean up associated profiles and the test user
      await pool.query(
        "DELETE FROM profiles_business WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)",
        [userId]
      );
      await pool.query(
        "DELETE FROM profiles_personal WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)",
        [userId]
      );
      await pool.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    // Close the database connection
    await pool.end();
  });

  it.only("should create a personal profile successfully", async () => {
    const payload = {
      profileType: "personal",
      profileData: {
        occupation: "Software Engineer",
      },
    };

    const response = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`) // Add the JWT to the Authorization header
      .send(payload)
      .expect(201);

    expect(response.body.message).toBe("Profile created successfully");

    // Verify the personal profile is saved in the database
    const profileResult = await pool.query(
      "SELECT id FROM profiles WHERE user_id = $1 AND profile_type = 'personal'",
      [userId]
    );
    expect(profileResult.rowCount).toBe(1);

    const personalProfileResult = await pool.query(
      "SELECT * FROM profiles_personal WHERE profile_id = $1",
      [profileResult.rows[0].id]
    );
    expect(personalProfileResult.rowCount).toBe(1);
    expect(personalProfileResult.rows[0].occupation).toBe("Software Engineer");
  });

  it("should create a business profile successfully", async () => {
    const payload = {
      profileType: "business",
      profileData: {
        business_website_url: "https://example.com",
        org_name: "Tech Corp",
        job_title: "CTO",
        work_email: "jane@techcorp.com",
        category: "Technology",
        logo_url: "https://example.com/logo.png",
        about_business: "We build tech solutions.",
        work_email_verified: true,
      },
    };

    const response = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`) // Add the JWT to the Authorization header
      .send(payload)
      .expect(201);

    expect(response.body.message).toBe("Profile created successfully");

    // Verify the business profile is saved in the database
    const profileResult = await pool.query(
      "SELECT id FROM profiles WHERE user_id = $1 AND profile_type = 'business'",
      [userId]
    );
    expect(profileResult.rowCount).toBe(1);

    const businessProfileResult = await pool.query(
      "SELECT * FROM profiles_business WHERE profile_id = $1",
      [profileResult.rows[0].id]
    );
    expect(businessProfileResult.rowCount).toBe(1);
    expect(businessProfileResult.rows[0].org_name).toBe("Tech Corp");
    expect(businessProfileResult.rows[0].work_email_verified).toBe(true);
  });

  it("should return 404 if user does not exist", async () => {
    console.log("process.env.JWT_SECRET", process.env.JWT_SECRET);

    const invalidToken = jwt.sign(
      { id: 99999, email: "nonexistent@example.com", tokenVersion: 0 },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "3m",
      }
    );

    const payload = {
      profileType: "personal",
      profileData: {
        occupation: "Non-existent Occupation",
      },
    };

    const response = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${invalidToken}`) // Use an invalid JWT
      .send(payload)
      .expect(404);

    expect(response.body.error).toBe("User not found");
  });

  it("should return 400 for validation errors", async () => {
    const payload = {
      profileType: "invalid-type", // Invalid profile type
      profileData: {}, // Missing required fields
    };

    const response = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`) // Add the JWT to the Authorization header
      .send(payload)
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Profile type must be either 'business' or 'personal'",
        }),
      ])
    );
  });
});
