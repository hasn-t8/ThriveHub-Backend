import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/auth";

const router = Router();

// Middleware to verify a JWT token
router.post("/auth/verify-token", (req: Request, res: Response): void => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: "Bad Request: Token is required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let email;

    if (typeof decoded === "object" && "email" in decoded) {
      email = decoded.email;
    }

    res.status(200).json({ status: true, message: "Token is valid", email });
    return;
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
});

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints for user authentication
 *
 * /auth/verify-token:
 *   post:
 *     summary: Verify the validity of a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The JWT token to verify.
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token is valid
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *       400:
 *         description: 'Bad Request: Token is missing'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Bad Request: Token is required'
 *       401:
 *         description: 'Unauthorized: Invalid or expired token'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Unauthorized: Invalid or expired token'
 */

export default router;
