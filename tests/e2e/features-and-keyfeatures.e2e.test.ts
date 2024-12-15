import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Feature Names and Key Features Endpoints", () => {
  let token: string;
  let userId: number;
  let featureNameId: number;
  let profileId: number;
  let businessProfileId: number;
  let keyFeatureId: number;

  beforeAll(async () => {
    // Create a test user and generate a token
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [`testuser007@example.com`, "securepassword", true, 0]
    );
    userId = userResult.rows[0].id;
    console.log('userId:', userId);
    

    token = jwt.sign({ id: userId, email: "testuser007@example.com", tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const profileResult = await pool.query(
      "INSERT INTO profiles (user_id, profile_type) VALUES ($1, $2) RETURNING id",
      [userId, 'business']
    );
    profileId = profileResult.rows[0].id;

    const businessProfileResult = await pool.query(
      "INSERT INTO profiles_business (org_name, profile_id) VALUES ($1, $2) RETURNING id",
      ["Test Business Profile", profileId]
    );
    businessProfileId = businessProfileResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM key_features WHERE created_by = $1", [userId]);
    await pool.query("DELETE FROM feature_names WHERE created_by = $1", [userId]);
    // await pool.query("DELETE FROM profiles_business WHERE id = $1", [businessProfileId]);
    // await pool.query("DELETE FROM profiles WHERE id = $1", [profileId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  it("should create a feature name", async () => {
    const response = await request(app)
      .post("/api/feature-names")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Feature" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Feature name created successfully");
    expect(response.body).toHaveProperty("featureNameId");

    featureNameId = response.body.featureNameId;
  });

  it("should fetch all feature names", async () => {
    const response = await request(app)
      .get("/api/feature-names")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should create a key feature", async () => {
    const response = await request(app)
      .post("/api/keyfeatures")
      .set("Authorization", `Bearer ${token}`)
      .send({
        businessProfileId,
        featureNameId,
        text: "This is a key feature text",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Key feature added successfully");
    expect(response.body).toHaveProperty("keyFeatureId");

    keyFeatureId = response.body.keyFeatureId;
  });

  it("should fetch all key features for a business profile", async () => {
    const response = await request(app)
      .get(`/api/keyfeatures/business-profile/${businessProfileId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: keyFeatureId,
          text: "This is a key feature text",
        }),
      ])
    );
  });

  it("should delete a key feature", async () => {
    const response = await request(app)
      .delete(`/api/keyfeatures/${keyFeatureId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Key feature deleted successfully");

    // Verify deletion
    const verifyResponse = await request(app)
      .get(`/api/keyfeatures/business-profile/${businessProfileId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(verifyResponse.body).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: keyFeatureId,
        }),
      ])
    );
  });

  it("should delete a feature name", async () => {
    const response = await request(app)
      .delete(`/api/feature-names/${featureNameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Feature name deleted successfully");

    // Verify deletion
    const verifyResponse = await request(app)
      .get(`/api/feature-names/${featureNameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(verifyResponse.status).toBe(404);
  });
});
