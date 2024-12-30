import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  addLike,
  removeLike,
  getLikesForEntity,
  getLikedEntitiesByUser,
} from "../../models/tc-likes.models";
import { updateReviewLikes } from "../../models/reviews.models";

const router = Router();

// Validation middleware for adding/removing likes
const validateLike = [
  check("entityType")
    .isString()
    .withMessage("Entity type must be a string (e.g., 'review', 'post')"),
  check("entityId").isInt().withMessage("Entity ID must be an integer"),
];

// Add a like
router.post(
  "/likes",
  verifyToken,
  validateLike,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { entityType, entityId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const likeId = await addLike(entityType, entityId, userId);
      if (entityType === "review") {
        await updateReviewLikes(entityId);
      }
      res.status(201).json({ message: "Like added successfully", likeId });
    } catch (error) {
      console.error("Error adding like:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Remove a like
router.delete(
  "/likes",
  verifyToken,
  validateLike,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { entityType, entityId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      await removeLike(entityType, entityId, userId);
      if (entityType === "review") {
        await updateReviewLikes(entityId);
      }
      res.status(200).json({ message: "Like removed successfully" });
    } catch (error) {
      console.error("Error removing like:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get total likes for an entity
router.get(
  "/likes/entity",
  [
    check("entityType")
      .isString()
      .withMessage("Entity type must be a string (e.g., 'review', 'post')"),
    check("entityId").isInt().withMessage("Entity ID must be an integer"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { entityType, entityId } = req.query;

    try {
      const likeCount = await getLikesForEntity(
        entityType as string,
        parseInt(entityId as string, 10)
      );
      res.status(200).json({ likeCount });
    } catch (error) {
      console.error("Error fetching like count:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get all likes by the authenticated user
router.get(
  "/likes/user",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const likes = await getLikedEntitiesByUser(userId);
      res.status(200).json(likes);
    } catch (error) {
      console.error("Error fetching user likes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Endpoints for managing likes
 *
 * /likes:
 *   post:
 *     summary: Add a like
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityType:
 *                 type: string
 *                 example: "review"
 *               entityId:
 *                 type: integer
 *                 example: 123
 *     responses:
 *       201:
 *         description: Like added successfully
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Remove a like
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityType:
 *                 type: string
 *                 example: "review"
 *               entityId:
 *                 type: integer
 *                 example: 123
 *     responses:
 *       200:
 *         description: Like removed successfully
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Internal server error
 *
 * /likes/entity:
 *   get:
 *     summary: Get total likes for an entity
 *     tags: [Likes]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           example: "review"
 *       - in: query
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       200:
 *         description: Total likes fetched successfully
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Internal server error
 *
 * /likes/user:
 *   get:
 *     summary: Get all likes by the authenticated user
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of liked entities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   entity_type:
 *                     type: string
 *                   entity_id:
 *                     type: integer
 *                   user_id:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 */
