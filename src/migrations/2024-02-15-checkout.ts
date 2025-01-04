import { Pool } from "pg";

/**
 * Migration to add checkouts table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create the checkouts table
    await client.query(`
      CREATE TABLE checkouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(100) NOT NULL,
        plan_id VARCHAR(50) NOT NULL,
        checkout_session_id VARCHAR(255) NOT NULL UNIQUE,
        session_completed_status VARCHAR(20) NOT NULL CHECK (session_completed_status IN ('completed', 'abandoned', 'pending')),
        failure_reason TEXT DEFAULT NULL,
        metadata JSONB DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table \`checkouts\` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating \`checkouts\` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Migration to drop the checkouts table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS checkouts;`);
    console.log("Table \`checkouts\` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping \`checkouts\` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
