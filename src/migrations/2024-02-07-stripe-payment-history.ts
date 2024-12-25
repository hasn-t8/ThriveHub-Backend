import { Pool } from "pg";

/**
 * Up migration: Create the `payment_history` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `payment_history` table
    await client.query(`
      CREATE TABLE payment_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
        amount INTEGER NOT NULL, -- Amount in cents
        currency VARCHAR(10) NOT NULL, -- E.g., USD
        status VARCHAR(50) NOT NULL, -- E.g., succeeded, failed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table `payment_history` created successfully.");

    // Add indexes
    await client.query(`CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);`);
    await client.query(`CREATE INDEX idx_payment_history_status ON payment_history(status);`);

    console.log("Indexes for `payment_history` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `payment_history` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `payment_history` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS payment_history;`);
    console.log("Table `payment_history` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `payment_history` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
