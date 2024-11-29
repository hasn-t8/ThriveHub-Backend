import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app"; // Import your Express app
import { JWT_SECRET, JWT_EXPIRATION } from "../../src/config/auth";

describe("JWT Token Verification E2E Test", () => {
  let validToken: string;
  let expiredToken: string;

  beforeAll(() => {
    // Generate a valid token
    validToken = jwt.sign(
      { id: 1, email: "testuser@example.com", tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // Generate an expired token
    expiredToken = jwt.sign(
      { id: 1, email: "testuser@example.com", tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: "-10s" } // Token already expired
    );
  });

  it("should verify a valid JWT token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-token") // API prefix included as mentioned in app.ts
      .send({ token: validToken })
      .expect(200);

    expect(response.body.message).toBe("token is valid");
    // expect(response.body.decoded).toMatchObject({
    //   id: 1,
    //   email: "testuser@example.com",
    //   tokenVersion: 0,
    // });
  });

  it("should return 401 for an expired JWT token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-token")
      .send({ token: expiredToken })
      .expect(401);

    expect(response.body.error).toBe("Unauthorized: Invalid or expired token");
  });

  it("should return 400 for missing token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-token")
      .send({})
      .expect(400);

    expect(response.body.error).toBe("Bad Request: Token is required");
  });

  it("should return 401 for an invalid JWT token", async () => {
    const invalidToken = "invalid.jwt.token";

    const response = await request(app)
      .post("/api/auth/verify-token")
      .send({ token: invalidToken })
      .expect(401);

    expect(response.body.error).toBe("Unauthorized: Invalid or expired token");
  });
});
