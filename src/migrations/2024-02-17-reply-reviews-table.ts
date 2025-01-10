import { Pool } from "pg";

/**
 * Up migration: Create the `review_replies` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `review_replies` table
    await client.query(`
      CREATE TABLE review_replies (
        id SERIAL PRIMARY KEY,
        review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        business_id INTEGER NOT NULL REFERENCES profiles_business(id) ON DELETE CASCADE,
        reply TEXT NOT NULL, -- Reply content
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date and time the reply was left
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Last update timestamp for the reply
      );
    `);

    console.log("Table `review_replies` created successfully.");

    // Add indexes for efficient querying
    await client.query(`CREATE INDEX idx_review_replies_review_id ON review_replies(review_id);`);
    await client.query(`CREATE INDEX idx_review_replies_business_id ON review_replies(business_id);`);

    console.log("Indexes for `review_replies` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `review_replies` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `review_replies` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS review_replies;`);
    console.log("Table `review_replies` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `review_replies` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
