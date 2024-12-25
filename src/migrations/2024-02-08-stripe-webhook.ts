import { Pool } from "pg";

/**
 * Up migration: Create the `webhook_events` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `webhook_events` table
    await client.query(`
      CREATE TABLE webhook_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(255) NOT NULL, -- E.g., invoice.payment_succeeded
        payload JSONB NOT NULL, -- Full JSON payload from Stripe
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table `webhook_events` created successfully.");

    // Add indexes
    await client.query(`CREATE INDEX idx_webhook_events_type ON webhook_events(type);`);

    console.log("Indexes for `webhook_events` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `webhook_events` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `webhook_events` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS webhook_events;`);
    console.log("Table `webhook_events` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `webhook_events` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
