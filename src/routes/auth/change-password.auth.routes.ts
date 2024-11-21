import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { findUserByEmail, updatePassword } from '../../models/user';
import { check, validationResult } from 'express-validator';
import { verifyToken } from '../../middleware/authenticate';
import { AuthenticatedRequest } from '../../types/authenticated-request';

const router = Router();

// Validation middleware for changing password
const validateChangePassword = [
  check('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  check('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

// Change password route
router.post(
  '/auth/change-password',
  verifyToken,
  validateChangePassword,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const email = req.user?.email;

    if (!email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
      // Find the user
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({ error: 'Incorrect current password' });
        return;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      await updatePassword(user.id, hashedPassword);

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default router;
