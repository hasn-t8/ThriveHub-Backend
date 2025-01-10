import { Pool } from "pg";

export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Modifying `avg_rating` column in `profiles_business` table...");

    // Modify the `avg_rating` column if necessary
    await client.query(`
      DO $$
      BEGIN
        -- Check and modify column type
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles_business' AND column_name = 'avg_rating' 
          AND data_type = 'numeric' AND numeric_precision = 4 AND numeric_scale = 2
        ) THEN
          ALTER TABLE profiles_business
          ALTER COLUMN avg_rating TYPE NUMERIC(4, 2);
        END IF;

        -- Check and set default value
        IF NOT EXISTS (
          SELECT 1
          FROM pg_attrdef ad
          JOIN pg_class c ON c.oid = ad.adrelid
          JOIN pg_attribute a ON a.attnum = ad.adnum
          WHERE c.relname = 'profiles_business'
            AND a.attname = 'avg_rating'
            AND pg_get_expr(ad.adbin, ad.adrelid) = '0.00'
        ) THEN
          ALTER TABLE profiles_business
          ALTER COLUMN avg_rating SET DEFAULT 0.00;
        END IF;

        -- Check and set NOT NULL constraint
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles_business' AND column_name = 'avg_rating' AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE profiles_business
          ALTER COLUMN avg_rating SET NOT NULL;
        END IF;

        -- Check and add CHECK constraint
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'chk_avg_rating_range'
        ) THEN
          ALTER TABLE profiles_business
          ADD CONSTRAINT chk_avg_rating_range CHECK (avg_rating >= 0 AND avg_rating <= 10);
        END IF;
      END $$;
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
      ALTER COLUMN avg_rating TYPE NUMERIC(3, 2);
      ALTER COLUMN avg_rating SET DEFAULT 0.00;
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
