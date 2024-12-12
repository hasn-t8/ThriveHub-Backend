import { Pool } from "pg";

// Up Migration: Creates the 'key_point' table
export const up = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS key_point (
      id SERIAL PRIMARY KEY,
      name INTEGER NOT NULL, 
      text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      parent_type VARCHAR(50) NOT NULL CHECK (parent_type IN ('key_feature', 'why_us')),
      parent_id INTEGER NOT NULL
      --,
      -- Foreign keys
      --CONSTRAINT fk_feature_name FOREIGN KEY (name) REFERENCES feature_names(id) ON DELETE CASCADE,
      --CONSTRAINT fk_parent_key_feature FOREIGN KEY (parent_id) REFERENCES key_features(id) ON DELETE CASCADE,
      --CONSTRAINT fk_parent_why_us FOREIGN KEY (parent_id) REFERENCES why_us(id) ON DELETE CASCADE
    );
  `);
};

// Down Migration: Rolls back the changes by dropping the 'key_point' table
export const down = async (pool: Pool) => {
  await pool.query(`
    DROP TABLE IF EXISTS key_point;
  `);
};
