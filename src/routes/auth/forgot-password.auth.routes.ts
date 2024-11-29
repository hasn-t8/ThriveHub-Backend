import { Router, Request, Response } from "express";
import { findUserByEmail, saveResetToken } from "../../models/user";
import { check, validationResult } from "express-validator";
import crypto from "crypto";
// import nodemailer from "nodemailer";

const router = Router();

// Validation middleware for the "Forgot Password" route
const validateForgotPassword = [
  check("email").isEmail().withMessage("Email must be valid"),
];

router.post(
  "/auth/forgot-password",
  validateForgotPassword,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;

    try {
      // Find user by email
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Save reset token in the database
      await saveResetToken(user.id, resetToken);

      // Send reset token via email
      // Uncomment below to enable email sending with nodemailer
      /*
      const transporter = nodemailer.createTransport({
        service: "gmail", // Replace with your email service
        auth: {
          user: process.env.EMAIL_USER, // Set this in your .env file
          pass: process.env.EMAIL_PASS, // Set this in your .env file
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        text: `You requested a password reset. Use this token to reset your password: ${resetToken}`,
      };

      await transporter.sendMail(mailOptions);
      */

      res
        .status(200)
        .json({ message: `Password reset token sent successfully. ${resetToken}` });
    } catch (error) {
      console.error("Error in Forgot Password:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Password Management
 *   description: Endpoints for managing user passwords
 *
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset token
 *     tags: [Password Management]
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
 *                 description: The email address of the user requesting the password reset.
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset token sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset token sent successfully
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
 *       404:
 *         description: User not found
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

export default router;
