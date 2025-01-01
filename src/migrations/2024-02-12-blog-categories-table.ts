import { Pool } from "pg";

/**
 * Migration to add categories table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create the categories table
    await client.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table `categories` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `categories` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Migration to drop the categories table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS categories;`);
    console.log("Table `categories` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `categories` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Category model and related operations.
 */
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
