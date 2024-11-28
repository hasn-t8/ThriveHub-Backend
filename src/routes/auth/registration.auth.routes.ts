import { Router, Request, Response } from "express";

import {
  createUser,
  findUserByEmail,
  assignUserTypes,
  saveVerificationCode,
} from "../../models/user";
import { check, validationResult } from "express-validator";
import crypto from "crypto";

const router = Router();

// Validation middleware for the "register" route
const validateRegister = [
  check("email").isEmail().withMessage("Email must be valid"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  check("types")
    .isArray({ min: 1 })
    .withMessage("Types must be an array with at least one element"),
  check("types.*").isString().withMessage("Each type must be a string"),
];

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication and user registration
 *
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - types
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: The user's password (at least 6 characters).
 *                 example: "securePassword123"
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: An array of user types.
 *                 example: ["registered-user", "business-owner", "team-member"]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *       400:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         description: Error message
 *                         example: Password must be at least 6 characters
 *       409:
 *         description: Conflict error (email already exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Conflict: Email already exists"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal Server Error
 */
router.post(
  "/auth/register",
  validateRegister,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, types, full_name } = req.body;

    try {
      // Check if email already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ error: "Conflict: Email already exists" });
        return;
      }

      // Create the user and get their ID
      const userId = await createUser(email, password, full_name);

      // Assign user types
      await assignUserTypes(userId, types);

      // // Generate a 6-digit verification code
      // const verificationCode = crypto.randomInt(100000, 999999);

      // // Save the verification code
      // await saveVerificationCode(userId, verificationCode);

      // console.log("New User registered with the verificationCode: " + verificationCode);

      res.status(201).json({ message: 'User registered successfully' });
      return;
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  }
);

export default router;
