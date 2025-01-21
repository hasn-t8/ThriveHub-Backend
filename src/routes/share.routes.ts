import { Router, Response } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { verifyToken } from "../middleware/authenticate";
import { addShare, getShareCountForReview, getSharesForReview } from "../models/share.models";

const router = Router();

/**
 * Log a share for a review
 */
router.post(
  "/reviews/:reviewId/share",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reviewId = parseInt(req.params.reviewId, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      const userId = req.user?.id || null; // Get the user ID from the token (optional)
      const newShare = await addShare(reviewId, userId);

      res.status(201).json({ message: "Review shared successfully", share: newShare });
    } catch (error) {
      console.error("Error logging share:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Get share count for a review
 */
router.get(
  "/reviews/:reviewId/share-count",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reviewId = parseInt(req.params.reviewId, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      const shareCount = await getShareCountForReview(reviewId);

      res.status(200).json({ reviewId, shareCount });
    } catch (error) {
      console.error("Error fetching share count:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Get all shares for a review
 */
router.get(
  "/reviews/:reviewId/shares",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reviewId = parseInt(req.params.reviewId, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      const shares = await getSharesForReview(reviewId);

      res.status(200).json(shares);
    } catch (error) {
      console.error("Error fetching shares:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
