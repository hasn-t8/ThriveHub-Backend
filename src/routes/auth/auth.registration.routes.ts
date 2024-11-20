import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findUserByEmail, assignUserTypes } from '../../models/user';
import { check, validationResult } from 'express-validator';

const router = Router();

// Validation middleware for the "register" route
const validateRegister = [
  check('email').isEmail().withMessage('Email must be valid'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  check('types')
    .isArray({ min: 1 })
    .withMessage('Types must be an array with at least one element'),
  check('types.*')
    .isString()
    .withMessage('Each type must be a string'),
];

// Register a user
router.post(
  '/auth/register',
  validateRegister,
  async (req: Request, res: Response): Promise<void> => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, types } = req.body;

    try {
      // Check if email already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: 'Conflict: Email already exists' });
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the user and get their ID
      const userId = await createUser(email, hashedPassword);

      // Assign user types
      await assignUserTypes(userId, types);

      res.status(201).json({ message: 'User registered successfully' });
      return;
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  }
);

export default router;
