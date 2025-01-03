import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import { getPoliciesForUser } from "../../models/policy.models";
import {
  createReview,
  updateReview,
  checkReviewOwnership,
  getReviewsForBusiness,
  getReviewsByUserId,
  deleteReview,
  getReviewById,
  getAllReviews,
  getReviewsByApprovalStatus
} from "../../models/reviews.models";
import pool from "../../config/db";

const router = Router();

// Validation middleware for reviews
const validateReview = [
  check("businessId").isInt().withMessage("Business ID must be an integer"),
  check("rating")
    .isInt({ min: 1, max: 10 })
    .withMessage("Rating must be an integer between 1 and 10"),
  check("feedback").isString().withMessage("Feedback must be a string"),
];
const validatePUTReview = [
  check("rating")
    .isInt({ min: 1, max: 10 })
    .withMessage("Rating must be an integer between 1 and 10"),
  check("feedback").isString().withMessage("Feedback must be a string"),
];

// Get all reviews
router.get(
  "/reviews",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reviews = await getAllReviews();
      if (!reviews || reviews.length === 0) {
        res.status(404).json({ error: "No reviews found" });
        return;
      }
      res.status(200).json(reviews);
    } catch (error) {
      console.error("Error fetching all reviews:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


// Get reviews by approval status
router.get(
  "/reviews/approval-status/:status",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { status } = req.params;

    // Validate the approval status
    if (status !== "true" && status !== "false") {
      res.status(400).json({ error: "Invalid status value. Use 'true' or 'false'." });
      return;
    }

    try {
      const isApproved = status === "true";
      const reviews = await getReviewsByApprovalStatus(isApproved);

      if (!reviews || reviews.length === 0) {
        res.status(404).json({ error: "No reviews found for the given approval status." });
        return;
      }

      res.status(200).json(reviews);
    } catch (error) {
      console.error("Error fetching reviews by approval status:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
// Get all reviews for a specific business
router.get(
  "/reviews/business/:businessId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = parseInt(req.params.businessId, 10);

    if (isNaN(businessId)) {
      res.status(400).json({ error: "Invalid Business ID" });
      return;
    }

    try {
      const reviews = await getReviewsForBusiness(businessId);

      if (!reviews || reviews.length === 0) {
        res.status(404).json({ error: "No reviews found for this business" });
        return;
      }

      res.status(200).json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Create a new review
router.post(
  "/reviews",
  verifyToken,
  validateReview,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { businessId, rating, feedback } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const reviewId = await createReview(businessId, userId, rating, feedback);
      res
        .status(201)
        .json({ message: "Review created successfully", reviewId });
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update an existing review
router.put(
  "/reviews/:reviewId",
  verifyToken,
  validatePUTReview,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const reviewId = parseInt(req.params.reviewId, 10);
    const { rating, feedback } = req.body;

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      // Check ownership
      const isOwner = await checkReviewOwnership(reviewId, userId);

      if (!isOwner) {
        res
          .status(403)
          .json({ error: "You are not authorized to update this review" });
        return;
      }

      // Proceed to update the review
      await updateReview(reviewId, userId, rating, feedback);
      res.status(200).json({ message: "Review updated successfully" });
    } catch (error) {
      if (error instanceof Error && error.message === "Review not found") {
        res.status(404).json({ error: "Review not found" });
        return;
      }
      console.error("Error updating review:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Approve a review
router.patch(
  "/reviews/:reviewId/approve",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const reviewId = parseInt(req.params.reviewId, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      // Check ownership or admin rights (add appropriate logic here if needed)
      const isOwner = await checkReviewOwnership(reviewId, userId);

      if (!isOwner) {
        res
          .status(403)
          .json({ error: "You are not authorized to approve this review" });
        return;
      }

      await pool.query(
        `UPDATE reviews SET approval_status = TRUE WHERE id = $1`,
        [reviewId]
      );

      res.status(200).json({ message: "Review approved successfully" });
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete a review
router.delete(
  "/reviews/:reviewId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reviewId = parseInt(req.params.reviewId, 10);
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      // Check ownership
      const isOwner = await checkReviewOwnership(reviewId, userId);
      const policies = await getPoliciesForUser(userId);
      const isAuthorized = policies.some((policy) => {
        const actionAllowed = policy.actions.includes("*") || policy.actions.includes("*");
        const resourceAllowed = policy.resources.includes("*") || policy.resources.includes("*");
        return actionAllowed && resourceAllowed && policy.effect === "Allow";
      });
      if (!isOwner && !isAuthorized) {
        res
          .status(403)
          .json({ error: "You are not authorized to delete this review" });
        return;
      }

      // Proceed to delete
      await deleteReview(reviewId);
      res.status(200).json({ message: "Review deleted successfully" });

    } catch (error) {
      if (error instanceof Error && error.message === "Review not found") {
        res.status(404).json({ error: "Review not found" });
        return;
      }
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get all reviews by the authenticated user
router.get(
  "/reviews",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const reviews = await getReviewsByUserId(userId);

      if (!reviews || reviews.length === 0) {
        res.status(404).json({ error: "No reviews found for this user" });
        return;
      }

      res.status(200).json(reviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
// Get a review by its ID
router.get(
  "/reviews/:reviewId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const reviewId = parseInt(req.params.reviewId, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: "Invalid Review ID" });
      return;
    }

    try {
      const review = await getReviewById(reviewId);

      if (!review) {
        res.status(404).json({ error: "Review not found" });
        return;
      }

      res.status(200).json(review);
    } catch (error) {
      console.error("Error fetching review:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Endpoints for managing reviews
 *
 * /reviews/business/{businessId}:
 *   get:
 *     summary: Get all reviews for a specific business
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business to fetch reviews for
 *     responses:
 *       200:
 *         description: A list of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   rating:
 *                     type: integer
 *                     description: Rating between 1 and 10
 *                   feedback:
 *                     type: string
 *                     description: User feedback
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   customer_name:
 *                     type: string
 *                     description: Name of the user who left the review
 *                   approval_status:
 *                     type: boolean
 *                     description: Approval status of the review
 *       404:
 *         description: No reviews found
 *       500:
 *         description: Internal server error
 *
 * /reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 description: Rating between 1 and 10
 *               feedback:
 *                 type: string
 *             example:
 *               businessId: 123
 *               rating: 8
 *               feedback: "Great service!"
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Internal server error
 * 
 * /reviews/user:
 *   get:
 *     summary: Get all reviews by the authenticated user
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   business_id:
 *                     type: integer
 *                   rating:
 *                     type: integer
 *                     description: Rating between 1 and 10
 *                   feedback:
 *                     type: string
 *                     description: User feedback
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   customer_name:
 *                     type: string
 *                     description: Name of the user who left the review
 *                   approval_status:
 *                     type: boolean
 *                     description: Approval status of the review
 *       404:
 *         description: No reviews found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 * /reviews/{reviewId}:
 *   put:
 *     summary: Update an existing review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the review to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 description: Rating between 1 and 10
 *               feedback:
 *                 type: string
 *                 description: User feedback
 *             example:
 *               rating: 9
 *               feedback: "Excellent service and prompt response!"
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review updated successfully
 *       400:
 *         description: Validation errors or invalid review ID
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the review to delete
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review deleted successfully
 *       400:
 *         description: Invalid review ID
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
