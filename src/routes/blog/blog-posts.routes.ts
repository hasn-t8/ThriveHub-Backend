import express, { Request, Response } from "express";
import {
  createBlogPost,
  getAllBlogPosts,
  getBlogPostsByCategory,
  updateBlogPost,
  deleteBlogPost,
  getBlogByAuthorId,
} from "../../models/blog-post.models";
import multer from "multer";

const upload = multer();
import { uploadToS3 } from "../../helpers/s3Helper";
import { verifyAdmin, verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";

const router = express.Router();

// Get all posts or filter by category
router.get("/posts", async (req: Request, res: Response): Promise<void> => {
  const { category_id } = req.query;

  try {
    if (category_id) {
      const posts = await getBlogPostsByCategory(Number(category_id));
      res.json(posts);
    } else {
      const posts = await getAllBlogPosts();
      res.json(posts);
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Create a new post
router.post(
  "/posts",
  verifyToken,
  upload.fields([
    { name: "image_cover", maxCount: 1 },
    { name: "image_thumbnail", maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        return;
      }
      const userId = user.id as number;

      const { category_id, title, content, is_published } = req.body;

      const uploadedFiles: { image_cover?: string; image_thumbnail?: string } = {};

      // Upload files using helper
      for (const [key, files] of Object.entries(req.files || {})) {
        const file = files[0]; // Multer returns an array of files for each field
        uploadedFiles[key as keyof typeof uploadedFiles] = await uploadToS3({
          folder: key === "image_cover" ? "blog_posts/image_covers" : "blog_posts/image_thumbnails",
          file,
        });
      }

      // Create blog post
      const post = await createBlogPost(
        userId,
        Number(category_id),
        title,
        content,
        is_published,
        uploadedFiles.image_cover || null,
        uploadedFiles.image_thumbnail || null
      );

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: (error as any)?.message || "Failed to create post" });
    }
  }
);

// Update an existing post
router.put(
  "/posts/:id",
  verifyToken,
  verifyAdmin,
  upload.fields([
    { name: "image_cover", maxCount: 1 },
    { name: "image_thumbnail", maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Unauthorized: No token provided" });
        return;
      }
      const userType = req.user?.type;

      const blogByAuthor = await getBlogByAuthorId(user.id as number);

      if (!blogByAuthor && userType !== "admin") {
        res.status(404).json({ error: "Post not found or not authorized." });
        return;
      }

      const { id } = req.params;
      const { title, content, is_published, category_id } = req.body;

      const uploadedFiles: { image_cover?: string; image_thumbnail?: string } = {};

      // Upload files using helper
      for (const [key, files] of Object.entries(req.files || {})) {
        const file = files[0];
        uploadedFiles[key as keyof typeof uploadedFiles] = await uploadToS3({
          folder: key === "image_cover" ? "blog_posts/image_covers" : "blog_posts/image_thumbnails",
          file,
        });
      }

      // Update blog post
      const updatedPost = await updateBlogPost(
        Number(id),
        title,
        content,
        is_published,
        category_id,
        uploadedFiles.image_cover,
        uploadedFiles.image_thumbnail
      );

      if (!updatedPost) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: (error as any)?.message || "Failed to update post" });
    }
  }
);

// Delete a post
router.delete(
  "/posts/:id",
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }
    const userType = req.user?.type;

    const blogByAuthor = await getBlogByAuthorId(user.id as number);

    if (!blogByAuthor && userType !== "admin") {
      res.status(404).json({ error: "Post not found or not authorized." });
      return;
    }

    const { id } = req.params;

    try {
      await deleteBlogPost(Number(id));
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      const err = error as Error;
      if (err.message === "Blog post not found") {
        res.status(404).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
/**
 * @swagger
 * tags:
 *   name: Blog Posts
 *   description: API endpoints for managing blog posts
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all blog posts or filter by category
 *     tags: [Blog Posts]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter posts by category ID
 *     responses:
 *       200:
 *         description: A list of blog posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: The ID of the blog post
 *                   author_id:
 *                     type: integer
 *                     description: The ID of the post's author
 *                   category_id:
 *                     type: integer
 *                     description: The category ID of the post
 *                   title:
 *                     type: string
 *                     description: The title of the blog post
 *                   content:
 *                     type: string
 *                     description: The content of the blog post
 *                   is_published:
 *                     type: boolean
 *                     description: Whether the post is published
 *                   image_cover:
 *                     type: string
 *                     description: URL of the cover image
 *                   image_thumbnail:
 *                     type: string
 *                     description: URL of the thumbnail image
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: The creation date of the post
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *                     description: The last update date of the post
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new blog post
 *     tags: [Blog Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - title
 *               - content
 *               - is_published
 *             properties:
 *               category_id:
 *                 type: integer
 *                 description: The ID of the category
 *               title:
 *                 type: string
 *                 description: The title of the blog post
 *               content:
 *                 type: string
 *                 description: The content of the blog post
 *               is_published:
 *                 type: boolean
 *                 description: Whether the post should be published
 *               image_cover:
 *                 type: string
 *                 format: binary
 *                 description: Cover image for the blog post
 *               image_thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image for the blog post
 *             example:
 *               category_id: 2
 *               title: "My First Blog Post"
 *               content: "This is the content of my first blog post."
 *               is_published: true
 *     responses:
 *       201:
 *         description: Blog post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the created blog post
 *                 image_cover:
 *                   type: string
 *                   description: URL of the uploaded cover image
 *                 image_thumbnail:
 *                   type: string
 *                   description: URL of the uploaded thumbnail image
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update an existing blog post
 *     tags: [Blog Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the blog post to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The new title of the blog post
 *               content:
 *                 type: string
 *                 description: The new content of the blog post
 *               is_published:
 *                 type: boolean
 *                 description: Whether the post should be published
 *               category_id:
 *                 type: integer
 *                 description: The new category ID of the blog post
 *               image_cover:
 *                 type: string
 *                 format: binary
 *                 description: New cover image for the blog post
 *               image_thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: New thumbnail image for the blog post
 *             example:
 *               title: "Updated Blog Post Title"
 *               content: "This is the updated content of the blog post."
 *               is_published: false
 *               category_id: 3
 *     responses:
 *       200:
 *         description: Blog post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the updated blog post
 *                 title:
 *                   type: string
 *                   description: The title of the blog post
 *                 content:
 *                   type: string
 *                   description: The content of the blog post
 *                 is_published:
 *                   type: boolean
 *                   description: Whether the blog post is published
 *                 category_id:
 *                   type: integer
 *                   description: The category ID of the blog post
 *                 image_cover:
 *                   type: string
 *                   description: URL of the cover image
 *                 image_thumbnail:
 *                   type: string
 *                   description: URL of the thumbnail image
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a blog post
 *     tags: [Blog Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the blog post to delete
 *     responses:
 *       200:
 *         description: Blog post deleted successfully
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Internal server error
 */
