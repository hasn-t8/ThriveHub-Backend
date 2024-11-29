import { Router, Response } from "express";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import pool from "../../config/db";

const router = Router();

router.post(
  "/auth/logout",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized: No user found" });
        return;
      }

      const { id } = req.user;

      // Invalidate the user's token by incrementing the token_version
      await pool.query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [id]);

      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error during logout:", error);
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
 * /auth/logout:
 *   post:
 *     summary: Log out a user by invalidating their JWT
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Unauthorized: No user found or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized: No user found
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
