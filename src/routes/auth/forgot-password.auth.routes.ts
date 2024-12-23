import { Router, Request, Response } from "express";
import { findUserByEmail, saveResetToken } from "../../models/user.models";
import { check, validationResult } from "express-validator";
import crypto from "crypto";
import { sendMail } from "../../helpers/mailgun.helper";
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_DEVLOPMENT = NODE_ENV === "development";

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

      // Generate a 6-digit verification code
      const resetToken = crypto.randomInt(10000, 99999);

      // Save reset token in the database
      await saveResetToken(user.id, resetToken);

      if (IS_DEVLOPMENT) {
        res.status(200).json({
          message: `Password reset token sent successfully. ${resetToken}`,
        });
      } else {
        const emailVariables = {
          full_name: user.full_name,
          recover_pass_token: resetToken,
        };

        // Send activation email
        await sendMail(
          email,
          "Recover Forgot Password",
          "Recover Password",
          emailVariables
        );
        res.status(200).json({ message: "password recovery token sent" });
      }
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
