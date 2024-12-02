import request from "supertest";
import app from "../../src/app"; // Your Express app
import pool from "../../src/config/db"; // Your database connection
import bcrypt from "bcrypt";
import crypto from "crypto";

describe("Account Verification E2E Test", () => {
  const testUser = {
    email: "verifyuser@example.com",
    password: "password123",
    types: ["registered-user"],
  };

  let verificationCode: number;

  beforeAll(async () => {
    // Hash the password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    // Create the user
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [testUser.email, hashedPassword, false, 0]
    );
    const userId = userResult.rows[0].id;

    // Generate and save the verification code
    verificationCode = crypto.randomInt(1000, 9999);
    await pool.query(
      "INSERT INTO user_verification (user_id, code) VALUES ($1, $2)",
      [userId, verificationCode]
    );
  });

  afterAll(async () => {
    // Clean up the users and verification table after each test
    await pool.query(
      "DELETE FROM user_verification WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [testUser.email]
    );
    await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await pool.query("DELETE FROM users WHERE email = $1", [
      "nocode@example.com",
    ]); // Cleanup for 'nocode@example.com'
    // Close the database connection
    await pool.end();
  });

  it("should retrieve the verification code for a valid user", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/get-code")
      .send({ email: testUser.email })
      .expect(200);

    expect(response.body.verificationCode).toBe(verificationCode);
  });

  it("should successfully verify an account with a valid code", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/verify")
      .send({
        email: testUser.email,
        code: verificationCode, // Use the valid code
      })
      .expect(200);

    expect(response.body.message).toBe("Account verified successfully");

    // Check if the user is now active
    const userResult = await pool.query(
      "SELECT is_active FROM users WHERE email = $1",
      [testUser.email]
    );
    expect(userResult.rows[0].is_active).toBe(true);

    // Check if the verification code has been removed
    const codeResult = await pool.query(
      "SELECT code FROM user_verification WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [testUser.email]
    );
    expect(codeResult.rowCount).toBe(0);
  });

  it("should return 400 for an invalid verification code", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/verify")
      .send({
        email: testUser.email,
        code: 1234, // Invalid code
      })
      .expect(404);

    expect(response.body.error).toBe("Invalid verification code");
  });

  it("should return 404 if the user is not found", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/verify")
      .send({
        email: "nonexistent@example.com", // Non-existent user
        code: verificationCode,
      })
      .expect(404);

    expect(response.body.error).toBe("User not found");
  });

  it("should return 400 for validation errors", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/verify")
      .send({
        email: testUser.email,
        code: "invalid_code", // Invalid format for code
      })
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Code must be a 4-digit number",
        }),
      ])
    );
  });

  it("should return 404 if the verification code is not found", async () => {
    // Create a user without a verification code
    const noCodeUserEmail = "nocode@example.com";
    const hashedPassword = await bcrypt.hash("password123", 10);

    await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [noCodeUserEmail, hashedPassword, false, 0]
    );

    const response = await request(app)
      .post("/api/auth/activate-account/verify")
      .send({
        email: noCodeUserEmail,
        code: verificationCode, // Valid format but no code exists
      })
      .expect(404);

    expect(response.body.error).toBe("Invalid verification code");
  });

  it("should return 404 when getting verification code for a non-existent user", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/get-code")
      .send({ email: "nonexistent@example.com" })
      .expect(404);

    expect(response.body.error).toBe("User not found");
  });

  it("should return 400 when getting verification code with invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/activate-account/get-code")
      .send({ email: "" }) // Invalid email
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Email must be valid",
        }),
      ])
    );
  });
});
