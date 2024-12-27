import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Admin Business Profiles Endpoints", () => {
  let adminToken: string;
  let userToken: string;
  let adminId: number;
  let userId: number;

  beforeAll(async () => {
    // Insert user types
    await pool.query("INSERT INTO user_types (type) VALUES ('admin') ON CONFLICT DO NOTHING");
    await pool.query("INSERT INTO user_types (type) VALUES ('user') ON CONFLICT DO NOTHING");

    // Create an admin user
    const hashedPasswordAdmin = await bcrypt.hash("adminpassword", 10);
    const adminResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      ["admin007@example.com", hashedPasswordAdmin, true, 0]
    );

    adminId = adminResult.rows[0].id;
    adminToken = jwt.sign(
      { id: adminId, email: "admin007@example.com", tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Assign admin role and policy
    const adminTypeResult = await pool.query("SELECT id FROM user_types WHERE type = 'admin'");
    const adminTypeId = adminTypeResult.rows[0].id;

    await pool.query(
      "INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [adminId, adminTypeId]
    );

    await pool.query(
      `INSERT INTO policies (user_id, effect, actions, resources) 
       VALUES ($1, 'Allow', $2, $3) ON CONFLICT DO NOTHING`,
      [adminId, JSON.stringify(["*"]), JSON.stringify(["*"])]
    );

    // Create a non-admin user
    const hashedPasswordUser = await bcrypt.hash("userpassword", 10);
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      ["user@example.com", hashedPasswordUser, true, 0]
    );

    userId = userResult.rows[0].id;
    userToken = jwt.sign(
      { id: userId, email: "user@example.com", tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Assign non-admin role
    const userTypeResult = await pool.query("SELECT id FROM user_types WHERE type = 'user'");
    const userTypeId = userTypeResult.rows[0].id;

    await pool.query(
      "INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, userTypeId]
    );
  });

  afterAll(async () => {
    // Cleanup: Remove test users and related data
    await pool.query("DELETE FROM profiles_business WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)", [adminId]);
    await pool.query("DELETE FROM profiles WHERE user_id IN ($1, $2)", [adminId, userId]);
    await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [adminId, userId]);
    await pool.end();
  });

  it("should retrieve all business profiles for an admin user", async () => {
    // Insert sample business profile data
    const profileResult = await pool.query(
      "INSERT INTO profiles (user_id, profile_type) VALUES ($1, 'business') RETURNING id",
      [adminId]
    );

    const businessProfileId = profileResult.rows[0].id;
    await pool.query(
      "INSERT INTO profiles_business (profile_id, org_name, category) VALUES ($1, $2, $3)",
      [businessProfileId, "Test Organization", "Technology"]
    );

    // Admin fetching all business profiles
    const response = await request(app)
      .get("/api/admin/businessprofiles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(1);

    // Clean up after this test
    await pool.query("DELETE FROM profiles_business WHERE profile_id = $1", [businessProfileId]);
    await pool.query("DELETE FROM profiles WHERE id = $1", [businessProfileId]);
  });

  it("should return 200 when no business profiles are found", async () => {
    const response = await request(app)
      .get("/api/admin/businessprofiles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // expect(response.body.error).toBe(undefined);
  });

  it("should handle internal server errors gracefully", async () => {
    // Temporarily mock `getAllBusinessProfiles` to throw an error
    jest
      .spyOn(require("../../src/models/business-profile.models"), "getAllBusinessProfiles")
      .mockImplementation(() => {
        throw new Error("Mocked error");
      });

    const response = await request(app)
      .get("/api/admin/businessprofiles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(500);

    expect(response.body.error).toBe("Internal Server Error");

    // Restore the original implementation
    jest.restoreAllMocks();
  });
});
