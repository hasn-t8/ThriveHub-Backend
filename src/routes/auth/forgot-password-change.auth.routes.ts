import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { findUserByEmail, updatePassword } from '../../models/user';
import pool from '../../config/db';
import { check, validationResult } from 'express-validator';

const router = Router();

// Validation middleware for changing the password
const validatePasswordChange = [
  check('email').isEmail().withMessage('Email must be valid'),
  check('token').notEmpty().withMessage('Reset token is required'),
  check('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Route to change the password
router.post(
  '/forgot-password/change',
  validatePasswordChange,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, token, newPassword } = req.body;

    try {
      // Find the user by email
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify the reset token
      const result = await pool.query(
        'SELECT token FROM password_resets WHERE user_id = $1',
        [user.id]
      );

      if (result.rowCount === 0 || result.rows[0].token !== token) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await updatePassword(user.id, hashedPassword);

      // Remove the reset token after successful password change
      await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default router;
