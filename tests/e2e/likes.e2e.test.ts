import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Likes API Endpoints", () => {
  const testUser = {
    email: "likesuser@example.com",
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
    await pool.query("DELETE FROM likes WHERE user_id = $1", [userId]);
    await pool.query("UPDATE reviews SET likes_total = 0 WHERE id = $1", [123]);
  });

  it("should add a like for a review", async () => {
    await pool.query("INSERT INTO reviews (id, likes_total) VALUES ($1, 0) ON CONFLICT DO NOTHING;", [123]);

    const response = await request(app)
      .post("/likes")
      .send({ entityType: "review", entityId: 123 })
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(response.body).toEqual({
      message: "Like added successfully",
      likeId: expect.any(Number),
    });

    const review = await pool.query("SELECT likes_total FROM reviews WHERE id = $1", [123]);
    expect(review.rows[0].likes_total).toBe(1);
  });

  it("should not add a duplicate like", async () => {
    await pool.query(
      "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('review', 123, $1);",
      [userId]
    );

    const response = await request(app)
      .post("/likes")
      .send({ entityType: "review", entityId: 123 })
      .set("Authorization", `Bearer ${token}`)
      .expect(500);

    expect(response.body).toHaveProperty("error", "Internal Server Error");
  });

  it("should remove a like for a review", async () => {
    await pool.query(
      "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('review', 123, $1);",
      [userId]
    );
    await pool.query("UPDATE reviews SET likes_total = 1 WHERE id = $1", [123]);

    const response = await request(app)
      .delete("/likes")
      .send({ entityType: "review", entityId: 123 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      message: "Like removed successfully",
    });

    const review = await pool.query("SELECT likes_total FROM reviews WHERE id = $1", [123]);
    expect(review.rows[0].likes_total).toBe(0);
  });

  it("should return total likes for an entity", async () => {
    await pool.query(
      "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('review', 123, $1);",
      [userId]
    );
    await pool.query("UPDATE reviews SET likes_total = 1 WHERE id = $1", [123]);

    const response = await request(app)
      .get("/likes/entity")
      .query({ entityType: "review", entityId: 123 })
      .expect(200);

    expect(response.body).toEqual({
      likeCount: 1,
    });
  });

  it("should fetch all likes by the authenticated user", async () => {
    await pool.query(
      "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('review', 123, $1);",
      [userId]
    );

    const response = await request(app)
      .get("/likes/user")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        {
          id: expect.any(Number),
          entity_type: "review",
          entity_id: 123,
          user_id: userId,
          created_at: expect.any(String),
        },
      ])
    );
  });

  it("should fail validation when entityType or entityId is invalid", async () => {
    const response = await request(app)
      .post("/likes")
      .send({ entityType: 123, entityId: "invalid" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        { msg: "Entity type must be a string (e.g., 'review', 'post')", param: "entityType" },
        { msg: "Entity ID must be an integer", param: "entityId" },
      ])
    );
  });

  it("should return unauthorized if user is not authenticated", async () => {
    const response = await request(app)
      .post("/likes")
      .send({ entityType: "review", entityId: 123 })
      .expect(401);

    expect(response.body).toHaveProperty("error", "Unauthorized");
  });
});
