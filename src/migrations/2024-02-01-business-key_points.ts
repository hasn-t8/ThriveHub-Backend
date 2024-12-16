import { Pool } from "pg";

/**
 * Up migration: Create tables business_key_point_names and business_key_points. 
 * For the Why Us and Features.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `business_key_point_names` table
    await client.query(`
      CREATE TABLE business_key_point_names (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL, -- For example: 'feature', 'why_us', etc.
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log("Table `business_key_point_names` created successfully.");

    // Create `business_key_points` table
    await client.query(`
      CREATE TABLE business_key_points (
        id SERIAL PRIMARY KEY,
        business_profile_id INTEGER NOT NULL REFERENCES profiles_business(id) ON DELETE CASCADE,
        business_key_point_name_id INTEGER NOT NULL REFERENCES business_key_point_names(id) ON DELETE RESTRICT, -- Prevent deletion if referenced
        type VARCHAR(50) NOT NULL, -- For example: 'feature', 'why_us', etc.
        text TEXT NOT NULL,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log("Table `business_key_points` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating tables:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop tables business_key_points and business_key_point_names.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS business_key_points;`);
    console.log("Table `business_key_points` dropped successfully.");

    await client.query(`DROP TABLE IF EXISTS business_key_point_names;`);
    console.log("Table `business_key_point_names` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping tables:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
