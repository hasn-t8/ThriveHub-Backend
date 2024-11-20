import request from 'supertest';
import app from '../../src/app'; // Express app entry point
import pool from '../../src/config/db'; // Database connection

describe('User Registration E2E Test', () => {
  beforeAll(async () => {
    // Clean up database and seed initial data for user types
    await pool.query('TRUNCATE TABLE user_user_types, users RESTART IDENTITY CASCADE;');
    await pool.query('TRUNCATE TABLE user_types RESTART IDENTITY CASCADE;');

    // Seed user types
    const userTypes = ['registered-user', 'business-owner', 'team-member'];
    for (const type of userTypes) {
      await pool.query('INSERT INTO user_types (type) VALUES ($1);', [type]);
    }
  });

  afterAll(async () => {
    // Close the database connection after tests
    await pool.end();
  });

  it('should register a new user with multiple types', async () => {
    const userPayload = {
      email: 'john.doe@example.com',
      password: 'securepassword',
      types: ['registered-user', 'business-owner'],
    };

    const response = await request(app)
      .post('/api/auth/register') // Route path
      .send(userPayload)
      .expect(201);

    expect(response.body.message).toBe('User registered successfully');

    // Verify user exists in the database
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [userPayload.email]);
    expect(userResult.rowCount).toBe(1);

    const user = userResult.rows[0];
    expect(user.email).toBe(userPayload.email);

    // Verify the user types are correctly assigned
    const userTypesResult = await pool.query(
      `SELECT ut.type
       FROM users u
       JOIN user_user_types uut ON u.id = uut.user_id
       JOIN user_types ut ON uut.type_id = ut.id
       WHERE u.email = $1`,
      [userPayload.email]
    );

    const assignedTypes = userTypesResult.rows.map((row) => row.type);
    expect(assignedTypes).toEqual(expect.arrayContaining(userPayload.types));
  });

  it('should return 409 when trying to register with an existing email', async () => {
    const userPayload = {
      email: 'john.doe@example.com', // Same email as the first test
      password: 'anotherpassword',
      types: ['team-member'],
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userPayload)
      .expect(409);

    expect(response.body.error).toBe('Conflict: Email already exists');
  });

  it('should return 400 for invalid input data', async () => {
    const invalidPayloads = [
      {
        email: 'invalidemail', // Invalid email
        password: 'password123',
        types: ['registered-user'],
      },
      {
        email: 'valid.email@example.com',
        password: '123', // Password too short
        types: ['business-owner'],
      },
      {
        email: 'valid.email@example.com',
        password: 'securepassword',
        types: [], // Empty types array
      },
    ];

    for (const payload of invalidPayloads) {
      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    }
  });
});
