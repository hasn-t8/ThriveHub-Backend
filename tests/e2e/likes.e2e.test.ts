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
  let testBusinessId: number;
  let profileId: number;

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
    profileId = profileResult.rows[0].id;
    // console.log("profileId >>> ", profileId);

    const businessResult = await pool.query(
      `INSERT INTO profiles_business (profile_id, org_name, views) VALUES ($1, 'Test Organization-1', 0) RETURNING id`,
      [profileId]
    );
    testBusinessId = businessResult.rows[0].id;
    // console.log("test__BusinessId >>> ", testBusinessId);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM profiles_business WHERE id = $1", [testBusinessId]);
    await pool.query("DELETE FROM profiles WHERE id = $1", [profileId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  afterEach(async () => {
    // Reset the database after each test
    // await pool.query("UPDATE reviews SET likes_total = 0 WHERE business_id = $1", [testBusinessId]);
    // await pool.query("DELETE FROM likes WHERE user_id = $1", [userId]);
  });

  it("should remove a like for a review", async () => {
    const reviewResult = await pool.query(
      "INSERT INTO reviews (business_id, user_id, rating) VALUES ($1, $2, $3) RETURNING id, likes_total;",
      [testBusinessId, userId, 4]
    );
    const reviewId = reviewResult.rows[0].id;
  
    const likeResult = await pool.query(
      "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('reviews', 123, $1) RETURNING id",
      [userId]
    );
    const likeId = likeResult.rows[0].id;
    await pool.query("UPDATE reviews SET likes_total = 1 WHERE id = $1", [reviewId]);

    const response = await request(app)
      .delete("/api/likes")
      .send({ entityType: "reviews", entityId: reviewId })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      message: "Like removed successfully",
    });

    const review = await pool.query("SELECT likes_total FROM reviews WHERE id = $1", [reviewId]);
    expect(review.rows[0].likes_total).toBe(0);

    await pool.query("DELETE FROM reviews WHERE business_id = $1", [reviewId]);
    await pool.query("DELETE FROM likes WHERE id = $1", [likeId]);
  });

  it("should add a like for a review", async () => {
    // Insert a review dynamically and fetch the review ID
    const reviewResult = await pool.query(
      "INSERT INTO reviews (business_id, user_id, rating) VALUES ($1, $2, $3) RETURNING id;",
      [testBusinessId, userId, 4]
    );
    const reviewId = reviewResult.rows[0].id;

    // Perform the like operation
    const response = await request(app)
      .post("/api/likes")
      .send({ entityType: "reviews", entityId: reviewId })
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(response.body).toEqual({
      message: "Like added successfully",
      likeId: expect.any(Number),
    });

    // Assert the total likes on the review
    const review = await pool.query("SELECT likes_total FROM reviews WHERE id = $1", [reviewId]);

    expect(review.rows[0].likes_total).toBe(1);
    await pool.query("DELETE FROM likes WHERE entity_id = $1", [reviewId]);
    await pool.query("DELETE FROM reviews WHERE business_id = $1", [reviewId]);
  });

  // it("should not add a duplicate like", async () => {
  //   await pool.query(
  //     "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('reviews', 123, $1);",
  //     [userId]
  //   );

  //   const response = await request(app)
  //     .post("/api/likes")
  //     .send({ entityType: "reviews", entityId: 123 })
  //     .set("Authorization", `Bearer ${token}`)
  //     .expect(500);

  //   expect(response.body).toHaveProperty("error", "Internal Server Error");
  // });

  it("should return total likes for an entity", async () => {
    const reviewResult = await pool.query(
      "INSERT INTO reviews (business_id, user_id, rating) VALUES ($1, $2, $3) RETURNING id;",
      [testBusinessId, userId, 4]
    );
    const reviewId = reviewResult.rows[0].id;

    await request(app)
      .post("/api/likes")
      .send({ entityType: "reviews", entityId: reviewId })
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    const response = await request(app)
      .get("/api/likes/entity")
      .query({ entityType: "reviews", entityId: reviewId })
      .expect(200);

    // console.log("response.body", response.body);
    expect(response.body).toEqual({
      likeCount: 1,
    });
    
    await pool.query("DELETE FROM reviews WHERE business_id = $1", [reviewId]);
    await pool.query("DELETE FROM likes WHERE entity_id = $1", [reviewId]);
  });

  it("should fetch all likes by the authenticated user", async () => {
    await pool.query(
      "INSERT INTO likes (entity_type, entity_id, user_id) VALUES ('reviews', 123, $1);",
      [userId]
    );

    const response = await request(app)
      .get("/api/likes/user")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        {
          id: expect.any(Number),
          entity_type: "reviews",
          entity_id: 123,
          user_id: userId,
          created_at: expect.any(String),
        },
      ])
    );
  });

  // it("should fail validation when entityType or entityId is invalid", async () => {
  //   const response = await request(app)
  //     .post("/api/likes")
  //     .send({ entityType: 123, entityId: "invalid" })
  //     .set("Authorization", `Bearer ${token}`)
  //     .expect(400);

  //   expect(response.body.errors).toEqual(
  //     expect.arrayContaining([
  //       { msg: "Entity type must be a string (e.g., 'reviews', 'post')", param: "entityType" },
  //       { msg: "Entity ID must be an integer", param: "entityId" },
  //     ])
  //   );
  // });

  // it("should return unauthorized if user is not authenticated", async () => {
  //   const response = await request(app)
  //     .post("/api/likes")
  //     .send({ entityType: "reviews", entityId: 123 })
  //     .expect(401);

  //   expect(response.body).toHaveProperty("error", "Unauthorized");
  // });
});
