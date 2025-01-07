import express, { Request, Response } from "express";
import { uploadImage, getImagesForBlogPost } from "../../models/image-upload.models";
import pool from "../../config/db"; // Ensure pool is imported for raw queries

const router = express.Router();

/**
 * Upload a new image
 */
router.post("/image-uploads", async (req: Request, res: Response): Promise<void> => {
  const { blogPostId, reviewId, imageUrl, imageType } = req.body;

  try {
    // Validate imageType
    if (!["post", "gallery", "review"].includes(imageType)) {
      res.status(400).json({ error: "Invalid imageType. Must be 'post', 'gallery', or 'review'." });
      return;
    }

    // Determine entityId based on type
    const entityId =
      imageType === "post" ? Number(blogPostId) : imageType === "review" ? Number(reviewId) : null;

    // Validate required IDs
    if (imageType === "post" && !entityId) {
      res.status(400).json({ error: "blogPostId is required for imageType 'post'." });
      return;
    }

    if (imageType === "review" && !entityId) {
      res.status(400).json({ error: "reviewId is required for imageType 'review'." });
      return;
    }

    const imageId = await uploadImage(
      entityId,
      imageUrl,
      imageType as "post" | "gallery" | "review"
    );
    res.status(201).json({ id: imageId });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get images for a specific blog post, optionally filtered by type
 */
router.get("/image-uploads/:blogPostId", async (req: Request, res: Response): Promise<void> => {
  const { blogPostId } = req.params;
  const { type } = req.query;

  try {
    const images = await getImagesForBlogPost(
      Number(blogPostId),
      type as "post" | "gallery" | "review"
    );
    res.json(images);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all images, optionally filtered by type
 */
router.get("/image-uploads", async (req: Request, res: Response): Promise<void> => {
  const { type } = req.query;

  try {
    const query = type
      ? `SELECT id, blog_post_id, image_url, image_type, created_at FROM images WHERE image_type = $1`
      : `SELECT id, blog_post_id, image_url, image_type, created_at FROM images`;

    const params = type ? [type as "post" | "gallery" | "review"] : [];
    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete an image by its ID
 */
router.delete("/image-uploads/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM images WHERE id = $1 RETURNING *`, [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    res.json({ message: "Image deleted successfully", deletedImage: result.rows[0] });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

/**
 * @swagger
 * tags:
 *   name: Image Uploads
 *   description: API endpoints for managing image uploads
 *
 * /image-uploads:
 *   post:
 *     summary: Upload a new image
 *     tags: [Image Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *               - imageType
 *             properties:
 *               blogPostId:
 *                 type: integer
 *                 description: ID of the blog post (required if imageType is 'post').
 *               reviewId:
 *                 type: integer
 *                 description: ID of the review (required if imageType is 'review').
 *               imageUrl:
 *                 type: string
 *                 description: URL of the uploaded image.
 *               imageType:
 *                 type: string
 *                 enum: ['post', 'gallery', 'review']
 *                 description: The type of the image.
 *             example:
 *               blogPostId: 1
 *               imageUrl: "https://example.com/image.jpg"
 *               imageType: "post"
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID of the uploaded image
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 *
 *   get:
 *     summary: Get all images, optionally filtered by type
 *     tags: [Image Uploads]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ['post', 'gallery', 'review']
 *         description: Filter images by type.
 *     responses:
 *       200:
 *         description: A list of images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   blog_post_id:
 *                     type: integer
 *                   image_url:
 *                     type: string
 *                   image_type:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 *
 * /image-uploads/{blogPostId}:
 *   get:
 *     summary: Get images for a specific blog post, optionally filtered by type
 *     tags: [Image Uploads]
 *     parameters:
 *       - in: path
 *         name: blogPostId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the blog post.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ['post', 'gallery', 'review']
 *         description: Filter images by type.
 *     responses:
 *       200:
 *         description: A list of images for the blog post
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   blog_post_id:
 *                     type: integer
 *                   image_url:
 *                     type: string
 *                   image_type:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 *
 * /image-uploads/{id}:
 *   delete:
 *     summary: Delete an image by its ID
 *     tags: [Image Uploads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the image to delete.
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Image deleted successfully"
 *                 deletedImage:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     blog_post_id:
 *                       type: integer
 *                     image_url:
 *                       type: string
 *                     image_type:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Image not found
 *       500:
 *         description: Internal server error
 */
