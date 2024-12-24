import { Pool } from "pg";

/**
 * Up migration: Create the `reviews` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `reviews` table
    await client.query(`
      CREATE TABLE reviews (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES profiles_business(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10), -- Ratings between 1 and 10
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date and time the review was left
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        customer_name VARCHAR(255) NOT NULL -- Name of the user leaving the review
      );
    `);

    console.log("Table `reviews` created successfully.");

    // Add indexes for efficient querying
    await client.query(`CREATE INDEX idx_reviews_business_id ON reviews(business_id);`);
    await client.query(`CREATE INDEX idx_reviews_user_id ON reviews(user_id);`);

    console.log("Indexes for `reviews` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `reviews` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `reviews` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS reviews;`);
    console.log("Table `reviews` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `reviews` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
