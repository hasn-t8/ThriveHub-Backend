import express, { Request, Response } from "express";
import {
  createBlogPost,
  getAllBlogPosts,
  getBlogPostsByCategory,
  updateBlogPost,
  deleteBlogPost,
} from "../../models/blog-post.models";

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
router.post("/posts", async (req: Request, res: Response): Promise<void> => {
  const { author_id, category_id, title, content, is_published } = req.body;

  try {
    const postId = await createBlogPost(author_id, category_id, title, content, is_published);
    res.status(201).json({ id: postId });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update an existing post
router.put("/posts/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, content, is_published, category_id } = req.body;

  try {
    const updatedPost = await updateBlogPost(Number(id), title, content, is_published, category_id);

    if (!updatedPost) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(updatedPost);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Delete a post
router.delete("/posts/:id", async (req: Request, res: Response): Promise<void> => {
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
});

export default router;

/**
 * @swagger
 * tags:
 *   name: Blog Posts
 *   description: API endpoints for managing blog posts
 *
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
 *
 *   post:
 *     summary: Create a new blog post
 *     tags: [Blog Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - author_id
 *               - category_id
 *               - title
 *               - content
 *             properties:
 *               author_id:
 *                 type: integer
 *                 description: The ID of the author
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
 *             example:
 *               author_id: 1
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
 *       500:
 *         description: Internal server error
 *
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
 *         application/json:
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
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Internal server error
 *
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
