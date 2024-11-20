import { Pool } from 'pg';

export const up = async (pool: Pool): Promise<void> => {
  try {
    // Step 1: Add the column as nullable
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN email VARCHAR(255);
    `);

    // Step 2: Populate with default values for existing rows
    await pool.query(`
      UPDATE users
      SET email = CONCAT('user_', id, '@example.com')
      WHERE email IS NULL;
    `);

    // Step 3: Alter the column to be NOT NULL
    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN email SET NOT NULL;
    `);

    console.log('Migration "add-email-to-users" applied successfully.');
  } catch (error) {
    console.error('Error applying migration "add-email-to-users":', error);
    throw error;
  }
};

export const down = async (pool: Pool): Promise<void> => {
  try {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN email;
    `);
    console.log('Migration "add-email-to-users" rolled back successfully.');
  } catch (error) {
    console.error('Error rolling back migration "add-email-to-users":', error);
    throw error;
  }
};
