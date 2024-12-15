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
    token = jwt.sign({ id: userId, email: testUser.email, tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    // Clean up test data and close the database connection
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  afterEach(async () => {
    // Reset the database after each test
    await pool.query("DELETE FROM profiles_business WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)", [userId]);
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

  it("should create or update a business profile for the user", async () => {
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
      .expect(200);

    expect(response.body).toHaveProperty("message", "Business profile updated");
    expect(response.body.profile).toHaveProperty("org_name", "New Organization");
    expect(response.body.profile).toHaveProperty("category", "Finance");
    expect(response.body.profile).toHaveProperty("work_email", "contact@neworg.com");
  });

  it("should delete a business profile", async () => {
    const tempProfileResult = await pool.query(
      `INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id`,
      [userId]
    );
    const tempProfileId = tempProfileResult.rows[0].id;

    await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, 'Temp Organization', 'Temp Category')`,
      [tempProfileId]
    );

    const response = await request(app)
      .delete(`/api/businessprofiles/${tempProfileId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty("message", "Business profile deleted successfully");

    const verifyResult = await pool.query(`SELECT * FROM profiles_business WHERE profile_id = $1`, [
      tempProfileId,
    ]);
    expect(verifyResult.rowCount).toBe(0);
  });

  it("should return 404 for non-existent business profiles on GET", async () => {
    const response = await request(app)
      .get("/api/businessprofiles/9999")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error).toBe("No business profiles found");
  });

  it("should return 404 for non-existent business profiles on DELETE", async () => {
    const response = await request(app)
      .delete("/api/businessprofiles/99999")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(response.body.error).toBe("Business profile not found");
  });
});
