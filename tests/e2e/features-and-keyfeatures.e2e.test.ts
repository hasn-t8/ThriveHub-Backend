import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Feature Names and Key Features Endpoints", () => {
  let token: string;
  let userId: number;
  let featureNameId: number;

  beforeAll(async () => {
    // Create a test user and generate a token
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [`testuser_${Date.now()}@example.com`, "securepassword", true, 0]
    );
    userId = userResult.rows[0].id;

    token = jwt.sign({ id: userId, email: "testuser@example.com", tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  afterAll(async () => {
    // Clean up test user and related data
    await pool.query("DELETE FROM key_features WHERE created_by = $1", [userId]);
    await pool.query("DELETE FROM feature_names WHERE created_by = $1", [userId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  it("should create a feature name", async () => {
    const response = await request(app)
      .post("/api/feature-names")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Feature", created_by: userId, updated_by: userId });

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
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: featureNameId,
          name: "Test Feature",
        }),
      ])
    );
  });

  it("should fetch a feature name by ID", async () => {
    const response = await request(app)
      .get(`/api/feature-names/${featureNameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", featureNameId);
    expect(response.body).toHaveProperty("name", "Test Feature");
  });

  it("should update a feature name", async () => {
    const response = await request(app)
      .put(`/api/feature-names/${featureNameId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Feature", updated_by: userId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Feature name updated successfully");
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
