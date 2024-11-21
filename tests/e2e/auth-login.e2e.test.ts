import request from 'supertest';
import app from '../../src/app'; // Import your Express app
import pool from '../../src/config/db'; // Import your database connection
import bcrypt from 'bcrypt';

const testUser = {
  email: 'testuser@example.com',
  password: 'password123',
  types: ['registered-user', 'business-owner'],
};

beforeAll(async () => {

  const hashedPassword = await bcrypt.hash(testUser.password, 10);

  await pool.query(
    'INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4)',
    [testUser.email, hashedPassword, true, 0]
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  await pool.end();
});

describe('User Login E2E Test', () => {
  it('should log in successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login') // API prefix included as mentioned in app.ts
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(response.body.message).toBe('Login successful');
    expect(response.body.token).toBeDefined(); // Token should be returned
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      })
      .expect(401);

    expect(response.body.error).toBe('Unauthorized: Invalid credentials');
  });

  it('should return 400 for validation errors', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: '', // Invalid email
        password: '', // Empty password
      })
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: 'Email must be valid',
        }),
        expect.objectContaining({
          msg: 'Password is required',
        }),
      ])
    );
  });

  it('should return 403 for inactive users', async () => {
    // Create an inactive user
    const inactiveUserEmail = 'inactiveuser@example.com';
    const hashedPassword = await bcrypt.hash('inactivepassword123', 10);

    await pool.query(
      'INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4)',
      [inactiveUserEmail, hashedPassword, false, 0]
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: inactiveUserEmail,
        password: 'inactivepassword123',
      })
      .expect(403);

    expect(response.body.error).toBe('Forbidden: User is inactive');
  });

  // it.only('should enforce rate-limiting after multiple failed attempts', async () => {
  //   const invalidCredentials = {
  //     email: testUser.email,
  //     password: 'wrongpassword',
  //   };

  //   for (let i = 0; i < 20; i++) {
  //     await request(app).post('/api/auth/login').send(invalidCredentials).expect(401);
  //   }

  //   const response = await request(app)
  //     .post('/api/auth/login')
  //     .send(invalidCredentials)
  //     .expect(429);
    
  //   console.log('response.text', response.text);

  //   expect(response.text).toBe('Too many login attempts, please try again later.');
  // });
});
