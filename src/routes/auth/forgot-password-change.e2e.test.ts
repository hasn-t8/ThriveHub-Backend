import request from 'supertest';
import app from '../../../src/app'; // Your Express app
import pool from '../../../src/config/db'; // Your database connection
import bcrypt from 'bcrypt';
import crypto from 'crypto';

describe('Forgot Password Change E2E Test', () => {
  const testUser = {
    email: 'changepassuser@example.com',
    password: 'password123',
  };

  let resetToken: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    // Insert test user
    const userResult = await pool.query(
      'INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id',
      [testUser.email, hashedPassword, true, 0]
    );

    const userId = userResult.rows[0].id;

    // Generate and save reset token
    resetToken = crypto.randomBytes(32).toString('hex');
    await pool.query('INSERT INTO password_resets (user_id, token) VALUES ($1, $2)', [userId, resetToken]);
  });

  afterAll(async () => {
    // Clean up database
    await pool.query('DELETE FROM password_resets WHERE token = $1', [resetToken]);
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.end();
  });

  it('should change the password successfully with a valid token', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password/change')
      .send({
        email: testUser.email,
        token: resetToken,
        newPassword: 'newpassword456',
      })
      .expect(200);

    expect(response.body.message).toBe('Password changed successfully');

    // Verify the password is updated
    const userResult = await pool.query('SELECT password FROM users WHERE email = $1', [testUser.email]);
    const isMatch = await bcrypt.compare('newpassword456', userResult.rows[0].password);
    expect(isMatch).toBe(true);
  });

  it('should return 400 for an invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password/change')
      .send({
        email: testUser.email,
        token: 'invalidtoken',
        newPassword: 'newpassword456',
      })
      .expect(400);

    expect(response.body.error).toBe('Invalid or expired reset token');
  });

  it('should return 404 for a non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password/change')
      .send({
        email: 'nonexistent@example.com',
        token: resetToken,
        newPassword: 'newpassword456',
      })
      .expect(404);

    expect(response.body.error).toBe('User not found');
  });

  it('should return 400 for invalid input', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password/change')
      .send({
        email: testUser.email,
        token: '', // Missing token
        newPassword: '', // Missing password
      })
      .expect(400);

    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: 'Reset token is required',
        }),
        expect.objectContaining({
          msg: 'Password must be at least 6 characters',
        }),
      ])
    );
  });
});
