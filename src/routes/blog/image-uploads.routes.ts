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
    if (!['post', 'gallery', 'review'].includes(imageType)) {
      res.status(400).json({ error: "Invalid imageType. Must be 'post', 'gallery', or 'review'." });
      return;
    }

    // Determine entityId based on type
    const entityId =
      imageType === 'post' ? Number(blogPostId) : imageType === 'review' ? Number(reviewId) : null;

    // Validate required IDs
    if (imageType === 'post' && !entityId) {
      res.status(400).json({ error: "blogPostId is required for imageType 'post'." });
      return;
    }

    if (imageType === 'review' && !entityId) {
      res.status(400).json({ error: "reviewId is required for imageType 'review'." });
      return;
    }

    const imageId = await uploadImage(entityId, imageUrl, imageType as 'post' | 'gallery' | 'review');
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
      type as 'post' | 'gallery' | 'review'
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

    const params = type ? [type as 'post' | 'gallery' | 'review'] : [];
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
