import { Pool } from "pg";

/**
 * Up migration: Create the `bookmarks` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        business_id INTEGER NOT NULL REFERENCES profiles_business(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, business_id)
      );
    `);

    console.log("Table `bookmarks` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error) {
      console.error("Error creating `bookmarks` table:", error.message);
    } else {
      console.error("Unknown error occurred while creating `bookmarks` table.");
    }
    throw error; // Rethrow after handling
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `bookmarks` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS bookmarks;`);
    console.log("Table `bookmarks` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error) {
      console.error("Error dropping `bookmarks` table:", error.message);
    } else {
      console.error("Unknown error occurred while dropping `bookmarks` table.");
    }
    throw error; // Rethrow after handling
  } finally {
    client.release();
  }
};
