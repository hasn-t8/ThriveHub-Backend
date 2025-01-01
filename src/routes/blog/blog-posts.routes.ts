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
    const updatedPost = await updateBlogPost(
      Number(id),
      title,
      content,
      is_published,
      category_id
    );

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
