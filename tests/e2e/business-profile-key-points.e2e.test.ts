import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Business Key Points and Key Point Names Endpoints", () => {
  let token: string;
  let userId: number;
  let keyPointNameId: number;
  let profileId: number;
  let businessProfileId: number;
  let keyPointId: number;

  beforeAll(async () => {
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [uniqueEmail, "securepassword", true, 0]
    );
    userId = userResult.rows[0].id;

    const adminTypeResult = await pool.query("SELECT id FROM user_types WHERE type = 'admin'");
    const adminTypeId = adminTypeResult.rows[0].id;
    
    await pool.query(
      "INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, adminTypeId]
    );

    token = jwt.sign({ id: userId, email: uniqueEmail, tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const profileResult = await pool.query(
      "INSERT INTO profiles (user_id, profile_type) VALUES ($1, $2) RETURNING id",
      [userId, "business"]
    );
    profileId = profileResult.rows[0].id;

    const businessProfileResult = await pool.query(
      "INSERT INTO profiles_business (org_name, profile_id) VALUES ($1, $2) RETURNING id",
      ["Test Business Profile", profileId]
    );
    businessProfileId = businessProfileResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM business_key_points WHERE created_by = $1", [userId]);
    await pool.query("DELETE FROM business_key_point_names WHERE created_by = $1", [userId]);
    await pool.query("DELETE FROM profiles_business WHERE id = $1", [businessProfileId]);
    await pool.query("DELETE FROM profiles WHERE id = $1", [profileId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.query("DELETE FROM user_user_types WHERE user_id = $1", [userId]);
    await pool.end();
  });

  it("should create a business key point name", async () => {
    const response = await request(app)
      .post("/api/business-key-point-names")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Key Point Name 007", type: "feature" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Business Key Point Name created successfully");
    expect(response.body).toHaveProperty("keyPointNameId");

    keyPointNameId = response.body.keyPointNameId;
  });

  it("should create a business key point", async () => {
    const response = await request(app)
      .post("/api/business-key-points")
      .set("Authorization", `Bearer ${token}`)
      .send({
        businessProfileId,
        keyPointNameId,
        type: "feature",
        text: "This is a business key point text",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Business Key Point created successfully");
    expect(response.body).toHaveProperty("keyPointId");

    keyPointId = response.body.keyPointId;
  });

  it("should update a business key point", async () => {
    const response = await request(app)
      .put(`/api/business-key-points/${keyPointId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        keyPointNameId,
        type: "feature",
        text: "Updated business key point text",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Business Key Point updated successfully");
  });

  it("should fetch all business key points for a business profile", async () => {
    const response = await request(app)
      .get(`/api/business-key-points/business-profile/${businessProfileId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should delete a business key point", async () => {
    const response = await request(app)
      .delete(`/api/business-key-points/${keyPointId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Business Key Point deleted successfully");

    // Verify deletion
    const verifyResponse = await request(app)
      .get(`/api/business-key-points/business-profile/${businessProfileId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(verifyResponse.body).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: keyPointId,
        }),
      ])
    );
  });

  it("should delete a business key point name", async () => {
    const response = await request(app)
      .delete(`/api/business-key-point-names/${keyPointNameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Business Key Point Name deleted successfully");

    // Verify deletion
    const verifyResponse = await request(app)
      .get(`/api/business-key-point-names/${keyPointNameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(verifyResponse.status).toBe(404);
  });
});
