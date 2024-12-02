import { Router, Request, Response } from "express";
import { findUserByEmail, activateUser } from "../../models/user";
import pool from "../../config/db";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import crypto from "crypto";
import { AuthenticatedRequest } from "../../types/authenticated-request";

const router = Router();

// Validation middleware for the "verify" route
const validateVerification = [
  check("email").isEmail().withMessage("Email must be valid"),
  check("code")
    .isInt({ min: 1000, max: 9999 })
    .withMessage("Code must be a 4-digit number"),
];

const validateGetCode = [
  check("email").isEmail().withMessage("Email must be valid"),
];

// Route to request a new verification code
router.post(
  "/auth/activate-account/request-new-code",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Generate a new 4-digit verification code
      const newCode = crypto.randomInt(1000, 9999);

      // Save the new code to the database
      await pool.query(
        `INSERT INTO user_verification (user_id, code)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET code = $2`,
        [userId, newCode]
      );

      res
        .status(200)
        .json({
          message: "New verification code sent successfully",
          code: newCode,
        });
    } catch (error) {
      console.error("Error requesting new verification code:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Verify account route
router.post(
  "/auth/activate-account/verify",
  validateVerification,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, code } = req.body;

    try {
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const result = await pool.query(
        "SELECT code FROM user_verification WHERE user_id = $1",
        [user.id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Invalid verification code" });
        return;
      }

      if (result.rows[0].code !== parseInt(code, 10)) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }

      await activateUser(email);

      await pool.query("DELETE FROM user_verification WHERE user_id = $1", [
        user.id,
      ]);

      res.status(200).json({ message: "Account verified successfully" });
    } catch (error) {
      console.error("Error during verification:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Route to get the verification code
router.post(
  "/auth/activate-account/get-code",
  validateGetCode,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const result = await pool.query(
        "SELECT code FROM user_verification WHERE user_id = $1",
        [user.id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Invalid verification code" });
        return;
      }

      console.log("result.rows[0].code", result.rows[0].code);

      res.status(200).json({ verificationCode: result.rows[0].code });
    } catch (error) {
      console.error("Error fetching verification code:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Account Activation
 *   description: Endpoints for account activation and verification
 *
 * /api/auth/activate-account/verify:
 *   post:
 *     summary: Verify a user's account with a code
 *     tags: [Account Activation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address of the user.
 *                 example: user@example.com
 *               code:
 *                 type: integer
 *                 description: The 4-digit verification code.
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Account verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account verified successfully
 *       400:
 *         description: Validation errors or invalid code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid verification code
 *       404:
 *         description: User not found or code not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
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
 *
 * /api/auth/activate-account/get-code:
 *   post:
 *     summary: Retrieve the verification code for a user's account
 *     tags: [Account Activation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address of the user.
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Verification code retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verificationCode:
 *                   type: integer
 *                   description: The verification code.
 *                   example: 123456
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
 *                         example: Email must be valid
 *       404:
 *         description: User not found or code not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
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

/**
 * @swagger
 * tags:
 *   name: Account Activation
 *   description: Endpoints for account activation and verification
 *
 * /auth/activate-account/request-new-code:
 *   post:
 *     summary: Request a new verification code
 *     tags: [Account Activation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: New verification code sent successfully
 *                 code:
 *                   type: integer
 *                   example: 1234
 *       401:
 *         description: 'Unauthorized: Missing or invalid token'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
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
