import { Router, Response } from "express";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import { check, validationResult } from "express-validator";
import {
  addReviewReply,
  updateReviewReply,
  deleteReviewReply,
  getRepliesForReview,
  getReplyById,
} from "../../models/reply-reviews.model";
import { getBusinessProfilesByUserId } from "../../models/business-profile.models";

const router = Router();

// Validation middleware for review replies
const validateReply = [
  check("reply").isString().withMessage("Reply must be a string"),
];

/**
 * Get all replies for a specific review
 */
router.get(
  "/reviews/:reviewId/replies",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reviewId = parseInt(req.params.reviewId, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      const replies = await getRepliesForReview(reviewId);

      if (!replies || replies.length === 0) {
        res.status(404).json({ error: "No replies found for this review" });
        return;
      }

      res.status(200).json(replies);
    } catch (error) {
      console.error("Error fetching replies for review:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Add a reply to a review
 */
router.post(
    "/reviews/:reviewId/replies",
    verifyToken,
    validateReply,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
  
      const reviewId = parseInt(req.params.reviewId, 10);
      const { reply } = req.body;
  
      if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
  
      try {
        const businessProfiles = await getBusinessProfilesByUserId(req.user.id);
  
        if (!businessProfiles || businessProfiles.length === 0) {
          res.status(404).json({ error: "No business profiles found for this user" });
          return;
        }
  
        const businessId = businessProfiles[0].id;
  
        const newReply = await addReviewReply(reviewId, businessId, reply);
        res.status(201).json({ message: "Reply added successfully", reply: newReply });
      } catch (error) {
        console.error("Error adding reply to review:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  

/**
 * Update a reply
 */
router.put(
  "/replies/:replyId",
  verifyToken,
  validateReply,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const replyId = parseInt(req.params.replyId, 10);
    const { reply } = req.body;

    if (isNaN(replyId)) {
      res.status(400).json({ error: "Invalid Reply ID" });
      return;
    }

    try {
      const updatedReply = await updateReviewReply(replyId, reply);

      if (!updatedReply) {
        res.status(404).json({ error: "Reply not found" });
        return;
      }

      res.status(200).json({ message: "Reply updated successfully", reply: updatedReply });
    } catch (error) {
      console.error("Error updating reply:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Delete a reply
 */
router.delete(
  "/replies/:replyId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const replyId = parseInt(req.params.replyId, 10);

    if (isNaN(replyId)) {
      res.status(400).json({ error: "Invalid Reply ID" });
      return;
    }

    try {
      await deleteReviewReply(replyId);
      res.status(200).json({ message: "Reply deleted successfully" });
    } catch (error) {
      console.error("Error deleting reply:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Get a reply by its ID
 */
router.get(
  "/replies/:replyId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const replyId = parseInt(req.params.replyId, 10);

    if (isNaN(replyId)) {
      res.status(400).json({ error: "Invalid Reply ID" });
      return;
    }

    try {
      const reply = await getReplyById(replyId);

      if (!reply) {
        res.status(404).json({ error: "Reply not found" });
        return;
      }

      res.status(200).json(reply);
    } catch (error) {
      console.error("Error fetching reply:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
