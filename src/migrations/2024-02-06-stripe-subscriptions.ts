import { Pool } from "pg";

/**
 * Up migration: Create the `subscriptions` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `subscriptions` table
    await client.query(`
      CREATE TABLE subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_subscription_id VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL, -- E.g., monthly, yearly
        status VARCHAR(50) NOT NULL, -- E.g., active, canceled
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        next_billing_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table `subscriptions` created successfully.");

    await client.query(`CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);`);
    await client.query(`CREATE INDEX idx_subscriptions_status ON subscriptions(status);`);

    console.log("Indexes for `subscriptions` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `subscriptions` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `subscriptions` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS subscriptions;`);
    console.log("Table `subscriptions` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `subscriptions` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
