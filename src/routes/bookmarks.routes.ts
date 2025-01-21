import { Router, Response } from "express";
import { verifyToken } from "../middleware/authenticate";
import { AuthenticatedRequest } from "../types/authenticated-request";
import {
  isBookmarked,
  addBookmark,
  removeBookmark,
} from "../models/bookmarks.models";

const router = Router();

/**
 * Toggle bookmark for a business profile.
 */
router.post(
  "/business/:businessId/bookmark",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = parseInt(req.params.businessId, 10);

    if (isNaN(businessId)) {
      res.status(400).json({ error: "Invalid Business ID" });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const userId = req.user.id;

      // Check if already bookmarked
      const alreadyBookmarked = await isBookmarked(userId, businessId);

      if (alreadyBookmarked) {
        // Remove the bookmark
        await removeBookmark(userId, businessId);
        res.status(200).json({ message: "Bookmark removed successfully" });
      } else {
        // Add a bookmark
        const newBookmark = await addBookmark(userId, businessId);
        res.status(201).json({
          message: "Bookmark added successfully",
          bookmark: newBookmark,
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Check if a business is bookmarked by the user.
 */
router.get(
  "/business/:businessId/bookmark-status",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = parseInt(req.params.businessId, 10);

    if (isNaN(businessId)) {
      res.status(400).json({ error: "Invalid Business ID" });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const userId = req.user.id;
      const bookmarked = await isBookmarked(userId, businessId);

      res.status(200).json({ bookmarked });
    } catch (error) {
      console.error("Error checking bookmark status:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
