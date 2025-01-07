// categories.routes.ts
import express, { Request, Response } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../../models/blog-categories.models";

const router = express.Router();

// Get all categories
router.get("/categories", async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await getAllCategories();
    res.json(categories);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Get a category by ID
router.get("/categories/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const category = await getCategoryById(Number(id));
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(category);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Create a new category
router.post("/categories", async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  try {
    const categoryId = await createCategory(name);
    res.status(201).json({ id: categoryId });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Update a category by ID
router.put("/categories/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updatedCategory = await updateCategory(Number(id), name);
    if (!updatedCategory) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(updatedCategory);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Delete a category by ID
router.delete("/categories/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await deleteCategory(Number(id));
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;

/**
 * @swagger
 * tags:
 *   name: Blog Categories
 *   description: API endpoints for managing blog categories
 *
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Blog Categories]
 *     responses:
 *       200:
 *         description: A list of blog categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: The ID of the category
 *                   name:
 *                     type: string
 *                     description: The name of the category
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new category
 *     tags: [Blog Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category
 *             example:
 *               name: "Technology"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the created category
 *       500:
 *         description: Internal server error
 *
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Blog Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the category
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the category
 *                 name:
 *                   type: string
 *                   description: The name of the category
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 *
 *   put:
 *     summary: Update a category by ID
 *     tags: [Blog Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the category
 *             example:
 *               name: "Updated Technology"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the category
 *                 name:
 *                   type: string
 *                   description: The updated name of the category
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a category by ID
 *     tags: [Blog Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the category to delete
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category deleted successfully"
 *       500:
 *         description: Internal server error
 */
