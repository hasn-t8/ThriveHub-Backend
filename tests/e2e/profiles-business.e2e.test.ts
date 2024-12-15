import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Business Profile Routes E2E Test", () => {
  const testUser = {
    email: "businessprofileuser@example.com",
    password: "securepassword",
  };

  let userId: number;
  let token: string;
  let businessProfileId: number;

  beforeAll(async () => {
    // Create a test user and generate a JWT
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [testUser.email, hashedPassword, true, 0]
    );

    userId = userResult.rows[0].id;
    token = jwt.sign({ id: userId, email: testUser.email, tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Create a business profile for the user
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );

    businessProfileId = profileResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Test Organization', 'Tech')`,
      [businessProfileId]
    );
  });

  afterAll(async () => {
    // Clean up test data and close the database connection
    await pool.query("DELETE FROM profiles_business WHERE profile_id = $1", [businessProfileId]);
    await pool.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  it("should retrieve all business profiles for the user", async () => {
    const response = await request(app)
      .get("/api/businessprofiles")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          org_name: "Test Organization",
          category: "Tech",
          profile_id: businessProfileId,
        }),
      ])
    );
  });

  it("should create a new business profile for the user", async () => {
    const newBusinessProfileData = {
      profileData: {
        org_name: "New Organization",
        category: "Finance",
        work_email: "contact@neworg.com",
      },
    };

    const response = await request(app)
      .post("/api/businessprofiles")
      .set("Authorization", `Bearer ${token}`)
      .send(newBusinessProfileData)
      .expect(200);

    expect(response.body).toHaveProperty("message", "Business profile updated");
    expect(response.body.profile).toHaveProperty("org_name", "New Organization");
    expect(response.body.profile).toHaveProperty("category", "Finance");
    expect(response.body.profile).toHaveProperty("work_email", "contact@neworg.com");
  });

  it("should delete a business profile", async () => {
    // Create a temporary profile to delete
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    const tempProfileId = profileResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Temp Organization', 'Temp Category')`,
      [tempProfileId]
    );

    // Delete the temporary profile
    const response = await request(app)
      .delete(`/api/businessprofiles/${tempProfileId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty("message", "Business profile deleted successfully");

    // Verify deletion
    const verifyResponse = await pool.query(
      `SELECT * FROM profiles_business WHERE profile_id = $1`,
      [tempProfileId]
    );

    expect(verifyResponse.rowCount).toBe(0);
  });

  it("should return 404 when trying to retrieve non-existent business profiles", async () => {
    const response = await request(app)
      .get("/api/businessprofiles/99999") // Non-existent profile ID
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error).toBe("No business profiles found");
  });

  it("should return 404 when trying to delete a non-existent business profile", async () => {
    const response = await request(app)
      .delete("/api/businessprofiles/99999") // Non-existent profile ID
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error).toBe("Business profile not found");
  });
});
