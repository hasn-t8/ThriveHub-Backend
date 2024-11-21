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
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
