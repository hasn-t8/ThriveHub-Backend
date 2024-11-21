import request from "supertest";
import app from "../../src/app"; // Your Express app
import pool from "../../src/config/db"; // Your database connection
import bcrypt from "bcrypt";

describe("Forgot Password E2E Test", () => {
  const testUser = {
    email: "forgotpassword@example.com",
    password: "password123",
  };

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4)",
      [testUser.email, hashedPassword, true, 0]
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await pool.query(
      "DELETE FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [testUser.email]
    );
    await pool.end();
  });

  it("should send a reset token for a valid user", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: testUser.email })
      .expect(200);

    expect(response.body.message).toBe(
      "Password reset token sent successfully"
    );

    // Verify the reset token is saved in the database
    const result = await pool.query(
      "SELECT token FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = $1)",
      [testUser.email]
    );
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].token).toBeDefined();
  });

  it("should return 404 for a non-existent user", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nonexistent@example.com" })
      .expect(404);

    expect(response.body.error).toBe("User not found");
  });

  it("should return 400 for invalid email input", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "" }) // Invalid email
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Email must be valid" }),
      ])
    );
  });
});
