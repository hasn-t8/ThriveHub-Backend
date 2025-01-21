import { Pool } from "pg";

/**
 * Up migration: Create the `shares` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `shares` table
    await client.query(`
      CREATE TABLE shares (
        id SERIAL PRIMARY KEY,
        review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table `shares` created successfully.");

    // Add indexes for efficient querying
    await client.query(`CREATE INDEX idx_shares_review_id ON shares(review_id);`);
    await client.query(`CREATE INDEX idx_shares_user_id ON shares(user_id);`);

    console.log("Indexes for `shares` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `shares` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `shares` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS shares;`);
    console.log("Table `shares` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `shares` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
