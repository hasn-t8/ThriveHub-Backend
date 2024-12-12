import { Pool } from "pg";

// Up Migration: Creates the 'feature_names' table
export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feature_names (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER NOT NULL
    );
  `);
};

// Down Migration: Rolls back the changes by dropping the 'feature_names' table
export const down = async (pool: Pool) => {
  await pool.query(`
    DROP TABLE IF EXISTS feature_names;
  `);
};
