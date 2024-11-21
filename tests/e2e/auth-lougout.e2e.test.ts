import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Logout E2E Test", () => {
  const testUser = {
    email: "logoutuser@example.com",
    password: "password123",
    types: ["registered-user"],
  };

  let token: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id, token_version",
      [testUser.email, hashedPassword, true, 0]
    );
    const userId = userResult.rows[0].id;
    const tokenVersion = userResult.rows[0].token_version;

    token = jwt.sign(
      { id: userId, email: testUser.email, tokenVersion },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await pool.end();
  });

  it("should log out successfully with a valid token", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.message).toBe("Logout successful");
  });

  it("should invalidate the token after logout", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`) // Reuse the same token
      .expect(401);

    expect(response.body.error).toBe("Unauthorized: Invalid token");
  });

  it("should return 401 if no token is provided", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .expect(401);

    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("should return 401 for an invalid token", async () => {
    const invalidToken = jwt.sign(
      { id: 999, email: "invalid@example.com", tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${invalidToken}`)
      .expect(401);

    expect(response.body.error).toBe("Unauthorized: Invalid token");
  });
});
