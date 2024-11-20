import request from "supertest";
import app from "../../src/app"; // Import your Express app
import pool from "../../src/config/db"; // Import your database connection

describe("User Registration E2E Test", () => {
  beforeAll(async () => {
  });

  afterAll(async () => {
    // Delete user-user types associations for the specific test user
    await pool.query(
      `DELETE FROM user_user_types 
     WHERE user_id IN (SELECT id FROM users WHERE email = 'john@example.com');`
    );

    // Delete the test user
    await pool.query("DELETE FROM users WHERE email = $1;", [
      "john@example.com",
    ]);
    // Close the database connection after the tests
    await pool.end();
  });

  it("should register a new user with multiple types", async () => {
    const userPayload = {
      password: "password123",
      email: "john@example.com",
      types: ["registered-user", "business-owner"],
    };

    const response = await request(app)
      .post("/api/v1/auth/register") // Updated API path
      .send(userPayload)
      .expect(201);

    expect(response.body.message).toBe("User registered successfully");

    // Verify the user exists in the database
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [userPayload.email]
    );
    expect(userResult.rowCount).toBe(1);

    const user = userResult.rows[0];
    expect(user.email).toBe(userPayload.email);

    // Verify the user types
    const userTypesResult = await pool.query(
      `SELECT ut.type
       FROM users u
       JOIN user_user_types uut ON u.id = uut.user_id
       JOIN user_types ut ON uut.type_id = ut.id
       WHERE u.email = $1`,
      [userPayload.email]
    );

    const userTypes = userTypesResult.rows.map((row) => row.type);
    expect(userTypes).toEqual(expect.arrayContaining(userPayload.types));
  });

  it("should return 409 when registering with an existing email", async () => {
    const userPayload = {
      password: "newpassword123",
      email: "john@example.com", // Same email as the previous test
      types: ["team-member"],
    };

    const response = await request(app)
      .post("/api/v1/auth/register") // Updated API path
      .send(userPayload)
      .expect(409);

    expect(response.body.error).toBe("Conflict: Email already exists");
  });

  it("should return 400 when missing required fields", async () => {
    const incompletePayload = {
      password: "password123",
      // Missing email and types
    };

    const response = await request(app)
      .post("/api/v1/auth/register") // Updated API path
      .send(incompletePayload)
      .expect(400);

    expect(response.body.error).toBe(
      "Bad Request: Missing required fields or invalid types"
    );
  });
});
