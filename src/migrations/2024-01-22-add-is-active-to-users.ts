import { Pool } from 'pg';

export const up = async (pool: Pool): Promise<void> => {
  try {
    // Add the `is_active` column, defaulting to true
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN is_active BOOLEAN DEFAULT true;
    `);

    console.log('Migration "add-is-active-to-users" applied successfully.');
  } catch (error) {
    console.error('Error applying migration "add-is-active-to-users":', error);
    throw error;
  }
};

export const down = async (pool: Pool): Promise<void> => {
  try {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN is_active;
    `);
    console.log('Migration "add-is-active-to-users" rolled back successfully.');
  } catch (error) {
    console.error('Error rolling back migration "add-is-active-to-users":', error);
    throw error;
  }
};
