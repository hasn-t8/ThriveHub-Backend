import { Pool } from "pg";

// Up Migration: Creates the 'why_us' table
export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS why_us (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER
    );
  `);
};

// Down Migration: Rolls back the changes by dropping the 'why_us' table
export const down = async (pool: Pool) => {
  await pool.query(`
    DROP TABLE IF EXISTS why_us;
  `);
};
