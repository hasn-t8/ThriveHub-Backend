import pool from "../config/db";

export interface Category {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new category
 */
export const createCategory = async (name: string): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO categories (name) VALUES ($1) RETURNING id`,
    [name]
  );
  return result.rows[0].id;
};

/**
 * Get all categories
 */
export const getAllCategories = async (): Promise<Category[]> => {
  const result = await pool.query(`SELECT id, name, created_at, updated_at FROM categories`);
  return result.rows;
};

/**
 * Get a category by ID
 */
export const getCategoryById = async (id: number): Promise<Category | null> => {
  const result = await pool.query(
    `SELECT id, name, created_at, updated_at FROM categories WHERE id = $1`,
    [id]
  );
  return result.rowCount && result.rowCount > 0 ? result.rows[0] : null;
};

/**
 * Update a category by ID
 */
export const updateCategory = async (
  id: number,
  name: string
): Promise<Category | null> => {
  const result = await pool.query(
    `UPDATE categories SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, created_at, updated_at`,
    [name, id]
  );
  return result.rowCount && result.rowCount > 0 ? result.rows[0] : null;
};

/**
 * Delete a category by ID
 */
export const deleteCategory = async (id: number): Promise<void> => {
  await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
};
