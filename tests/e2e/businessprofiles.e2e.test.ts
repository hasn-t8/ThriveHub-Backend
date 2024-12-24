import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Business Profiles Endpoints", () => {
  const testUser = {
    email: "businessprofileuser@example.com",
    password: "securepassword",
  };

  let userId: number;
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
      {
        expiresIn: "1h",
      }
    );
  });

  afterAll(async () => {
    // Clean up test data and close the database connection
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  afterEach(async () => {
    // Reset the database after each test
    await pool.query(
      "DELETE FROM profiles_business WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)",
      [userId]
    );
    await pool.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
  });

  it("should retrieve all business profiles for the user", async () => {
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    const businessProfileId = profileResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Test Organization', 'Technology')`,
      [businessProfileId]
    );

    const response = await request(app)
      .get("/api/businessprofiles")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          org_name: "Test Organization",
          category: "Technology",
          profile_id: businessProfileId,
        }),
      ])
    );
  });

  it("should create a new business profile for the user", async () => {
    const newProfileData = {
      profileData: {
        org_name: "New Organization",
        category: "Finance",
        work_email: "contact@neworg.com",
      },
    };

    const response = await request(app)
      .post("/api/businessprofiles")
      .set("Authorization", `Bearer ${token}`)
      .send(newProfileData)
      .expect(201);

    expect(response.body).toHaveProperty(
      "message",
      "Business profile created successfully"
    );
  });

  it("should update an existing business profile for the user", async () => {
    // Create a business profile to update
    const profileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    const profile_id = profileResult.rows[0].id;

    console.log("profile_id", profile_id);

    await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Test Organization', 'Technology')`,
      [profile_id]
    );

    // Get the business profile ID
    const businessProfileResult = await pool.query(
      `SELECT id FROM profiles_business WHERE profile_id = $1`,
      [profile_id]
    );
    const businessProfileId = businessProfileResult.rows[0].id;

    const updatedProfileData = {
      profileData: {
        org_name: "Updated Organization",
        category: "Updated Category",
        work_email: "updated@neworg.com",
      },
    };

    const response = await request(app)
      .put(`/api/businessprofiles/${businessProfileId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedProfileData)
      .expect(200);

    expect(response.body).toHaveProperty(
      "message",
      "Business profile updated successfully"
    );
  });

  it("should delete a business profile", async () => {
    const tempProfileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    const tempProfileId = tempProfileResult.rows[0].id;
    console.log("tempProfileId", tempProfileId);

    const bp1 = await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Temp Organization', 'Temp Category') RETURNING id`,
      [tempProfileId]
    );

    const bizProfileId = bp1.rows[0].id;

    const response = await request(app)
      .delete(`/api/businessprofiles/${bizProfileId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty(
      "message",
      "Business profile deleted successfully"
    );

    const verifyResult = await pool.query(
      `SELECT * FROM profiles_business WHERE profile_id = $1`,
      [tempProfileId]
    );
    expect(verifyResult.rowCount).toBe(0);
  });

  it("should return 404 for non-existent business profiles on GET", async () => {
    const response = await request(app)
      .get("/api/businessprofiles")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error).toBe("No business profiles found");
  });

  it("should return 404 for non-existent business profiles on DELETE", async () => {
    const response = await request(app)
      .delete("/api/businessprofiles/0000000000000")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error).toBe("Business profile not found");
  });
});
