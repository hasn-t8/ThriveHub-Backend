import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection

describe("Reviews API Endpoints", () => {
  let token: string; // To store the authentication token for requests
  let businessId: number;
  let reviewId: number;

  beforeAll(async () => {
    // Mock user login or registration to get the token
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "testuser@example.com", password: "password123" });

    token = response.body.token;

    // Create a mock business for testing
    const businessResponse = await pool.query(`
      INSERT INTO profiles_business (org_name, category, logo_url)
      VALUES ('Test Business', 'Technology', 'https://example.com/logo.png')
      RETURNING id
    `);
    businessId = businessResponse.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await pool.query(`DELETE FROM reviews WHERE business_id = $1`, [
      businessId,
    ]);
    await pool.query(`DELETE FROM profiles_business WHERE id = $1`, [
      businessId,
    ]);
    pool.end();
  });

  test("GET /reviews/business/:businessId - Should return all reviews for a business", async () => {
    const response = await request(app)
      .get(`/api/reviews/business/${businessId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });

  test("POST /reviews - Should create a new review", async () => {
    const response = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${token}`)
      .send({
        businessId,
        rating: 8,
        feedback: "Great service!",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Review created successfully"
    );
    expect(response.body).toHaveProperty("reviewId");
    reviewId = response.body.reviewId;
  });

  test("PUT /reviews/:reviewId - Should update an existing review", async () => {
    const response = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rating: 9,
        feedback: "Excellent service and prompt response!",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Review updated successfully"
    );
  });

  test("DELETE /reviews/:reviewId - Should delete the review", async () => {
    const response = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Review deleted successfully"
    );
  });

  test("GET /reviews/business/:businessId - Should return 404 if no reviews exist", async () => {
    const response = await request(app)
      .get(`/api/reviews/business/${businessId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "error",
      "No reviews found for this business"
    );
  });
});
