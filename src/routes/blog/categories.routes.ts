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
