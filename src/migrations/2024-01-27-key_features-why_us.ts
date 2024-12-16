import { Pool } from "pg";

/**
 * Up migration: Create tables key_features, why_us, and feature_names.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `feature_names` table
    await client.query(`
          CREATE TABLE feature_names (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
            updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
          );
        `);

    console.log("Table `feature_names` created successfully.");

    // Create `key_features` table
    await client.query(`
      CREATE TABLE key_features (
        id SERIAL PRIMARY KEY,
        business_profile_id INTEGER NOT NULL REFERENCES profiles_business(id) ON DELETE CASCADE,
        feature_name_id INTEGER NOT NULL REFERENCES feature_names(id) ON DELETE RESTRICT, -- Prevent deletion if referenced
        text TEXT NOT NULL, -- Adding text field
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    console.log("Table `key_features` created successfully.");

    // Create `why_us` table
    await client.query(`
      CREATE TABLE why_us (
        id SERIAL PRIMARY KEY,
        business_profile_id INTEGER NOT NULL REFERENCES profiles_business(id) ON DELETE CASCADE,
        text TEXT NOT NULL, -- Adding text field
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    console.log("Table `why_us` created successfully.");

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
 * Down migration: Drop tables key_features, why_us, and feature_names.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS key_features;`);
    console.log("Table `key_features` dropped successfully.");

    await client.query(`DROP TABLE IF EXISTS why_us;`);
    console.log("Table `why_us` dropped successfully.");

    await client.query(`DROP TABLE IF EXISTS feature_names;`);
    console.log("Table `feature_names` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping tables:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
