import { Pool } from "pg";

// Up Migration: Creates the 'key_features' table
export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS key_features (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER
    );
  `);
};

// Down Migration: Rolls back the changes by dropping the 'key_features' table
export const down = async (pool: Pool) => {
  await pool.query(`
    DROP TABLE IF EXISTS key_features;
  `);
};
