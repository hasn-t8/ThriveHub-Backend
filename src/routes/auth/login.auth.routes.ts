import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "../../models/user";
import { check, validationResult } from "express-validator";
import { JWT_SECRET, JWT_EXPIRATION } from "../../config/auth";

const router = Router();

const validateLogin = [
  check("email").isEmail().withMessage("Email must be valid"),
  check("password").notEmpty().withMessage("Password is required"),
];

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many login attempts, please try again later.",
});

router.post(
  "/auth/login",
  loginLimiter,
  validateLogin,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await findUserByEmail(email);
      if (!user) {
        console.debug(`Login failed: No user found for email ${email}`);
        res.status(401).json({ error: "Unauthorized: Invalid credentials" });
        return;
      }

      if (!user.is_active) {
        res.status(403).json({ error: "Forbidden: User is inactive" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: "Unauthorized: Invalid credentials" });
        return;
      }

      const payload = {
        id: user.id,
        email: user.email,
        tokenVersion: user.token_version,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

      res.status(200).json({ message: "Login successful", token });
      return;
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints for user authentication
 *
 * /auth/login:
 *   post:
 *     summary: Login to the system and get a JWT token
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: The user's password.
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 *                         example: Email must be valid
 *       401:
 *         description: Unauthorized: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized: Invalid credentials
 *       403:
 *         description: Forbidden: User is inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Forbidden: User is inactive
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Too many login attempts, please try again later.
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

export default router;
