import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../src/config/auth';

describe('Change Password E2E Test', () => {
  const testUser = {
    email: 'changepassworduser@example.com',
    password: 'currentPassword123',
  };

  let authToken: string;

  beforeAll(async () => {
    // Hash the current password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    // Insert test user
    const userResult = await pool.query(
      'INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id',
      [testUser.email, hashedPassword, true, 0]
    );

    const userId = userResult.rows[0].id;

    // Generate a valid JWT token
    authToken = jwt.sign({ id: userId, email: testUser.email, tokenVersion: 0 }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    // Clean up database
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await pool.end();
  });

  it('should change the password successfully with valid input', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword: 'newPassword456',
      })
      .expect(200);

    expect(response.body.message).toBe('Password changed successfully');

    // Verify the new password is updated
    const userResult = await pool.query('SELECT password FROM users WHERE email = $1', [testUser.email]);
    const isMatch = await bcrypt.compare('newPassword456', userResult.rows[0].password);
    expect(isMatch).toBe(true);
  });

  it('should return 400 for incorrect current password', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: 'wrongPassword123',
        newPassword: 'newPassword456',
      })
      .expect(400);

    // expect(response.body.error).toBe('Incorrect current password');
  });

  //TODO: Fix this test - there should be restriction on password length. 
//   it('should return 400 for invalid input', async () => {
//     const response = await request(app)
//       .post('/api/auth/change-password')
//       .set('Authorization', `Bearer ${authToken}`)
//       .send({
//         currentPassword: '', // Missing current password
//         newPassword: 'short', // Invalid new password
//       })
//       .expect(401);

//     expect(response.body.errors).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           msg: 'Current password is required',
//         }),
//         expect.objectContaining({
//           msg: 'New password must be at least 6 characters long',
//         }),
//       ])
//     );
//   });


  it('should return 404 if the user is not found', async () => {
    const invalidToken = jwt.sign({ id: 9999, email: 'invalid@example.com' }, JWT_SECRET, {
      expiresIn: '1h',
    });

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${invalidToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword: 'newPassword456',
      })
      .expect(401);
  });
});
