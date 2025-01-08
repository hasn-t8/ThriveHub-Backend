import { Pool } from "pg";

export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Modifying `avg_rating` column in `profiles_business` table...");

    // Modify the `avg_rating` column
    await client.query(`
      ALTER TABLE profiles_business
      ALTER COLUMN avg_rating TYPE NUMERIC(4, 2),
      ALTER COLUMN avg_rating SET DEFAULT 0.00,
      ALTER COLUMN avg_rating SET NOT NULL;

      -- Add a CHECK constraint for the range 0 to 10 inclusive
      ALTER TABLE profiles_business
      ADD CONSTRAINT chk_avg_rating_range CHECK (avg_rating >= 0 AND avg_rating <= 10);
    `);

    console.log("`avg_rating` column modified successfully with range constraint.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error modifying `avg_rating` column:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Reverting changes to `avg_rating` column in `profiles_business` table...");

    // Remove the CHECK constraint and revert the column to its original state
    await client.query(`
      ALTER TABLE profiles_business
      DROP CONSTRAINT IF EXISTS chk_avg_rating_range;

      ALTER TABLE profiles_business
      ALTER COLUMN avg_rating TYPE NUMERIC(3, 2),
      ALTER COLUMN avg_rating SET DEFAULT 0.00,
      ALTER COLUMN avg_rating DROP NOT NULL;
    `);

    console.log("Reverted `avg_rating` column successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error reverting `avg_rating` column:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
