import request from "supertest";
import app from "../../src/app"; // Express app entry point
import pool from "../../src/config/db"; // Database connection
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/config/auth";

describe("Profiles E2E Test", () => {
  const testUser = {
    email: "profileuser@example.com",
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
    token = jwt.sign({ id: userId, email: testUser.email, tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  afterEach(async () => {
    // Clean up profiles after each test
    await pool.query(
      "DELETE FROM profiles_personal WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)",
      [userId]
    );
    await pool.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
  });

  afterAll(async () => {
    // Clean up the test user and close the database connection
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  });

  it("should fetch all profiles (empty initially)", async () => {
    const response = await request(app)
      .get("/api/profiles")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it("should create a personal profile", async () => {
    const personalPayload = {
      profileType: "personal",
      profileData: {
        occupation: "Software Engineer",
        date_of_birth: "1990-01-01",
        phone_number: "1234567890",
        address_line_1: "123 Main St",
        address_line_2: "Apt 4B",
        address_city: "Techville",
        address_zip_code: "12345",
        img_profile_url: "https://example.com/profile.jpg",
      },
    };

    // Create the personal profile
    const createResponse = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`)
      .send(personalPayload)
      .expect(200);

    expect(createResponse.body.message).toBe("Personal profile updated");
  });

  it("should return validation errors for invalid profile data", async () => {
    const invalidPayload = {
      profileType: "personal",
      profileData: {
        occupation: "",
      },
    };

    const response = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`)
      .send(invalidPayload)
      .expect(200);
  });

  it("should return 401 for missing or invalid JWT", async () => {
    const response = await request(app).get("/api/profiles").expect(401);
    expect(response.body.error).toBe("Unauthorized: No token provided");
  });

  it("should create and update personal profile data successfully", async () => {
    // Create the personal profile
    const personalPayload = {
      profileType: "personal",
      profileData: {
        occupation: "Software Engineer",
        date_of_birth: "1990-01-01",
        phone_number: "1234567890",
        address_line_1: "123 Main St",
        address_line_2: "Apt 4B",
        address_city: "Techville",
        address_zip_code: "12345",
        img_profile_url: "https://example.com/profile.jpg",
      },
    };

    await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`)
      .send(personalPayload)
      .expect(200);

    const fetchResponse = await request(app)
      .get("/api/profiles")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const personalProfile = fetchResponse.body;
    expect(personalProfile).toBeDefined();
    expect(personalProfile.profile_type).toBe("personal");
    expect(personalProfile.occupation).toBe(personalPayload.profileData.occupation);
    
    // Update the personal profile
    const updatedPayload = {
      profileType: "personal",
      profileData: {
        occupation: "Senior Software Engineer",
        address_city: "Innovate City",
      },
    };

    const updateResponse = await request(app)
      .post("/api/profiles")
      .set("Authorization", `Bearer ${token}`)
      .send(updatedPayload)
      .expect(200);

    expect(updateResponse.body.message).toBe("Personal profile updated");
  });
});
