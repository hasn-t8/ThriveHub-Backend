import { Pool } from 'pg';

export const up = async (pool: Pool): Promise<void> => {
  try {
    // Add the `token_version` column, defaulting to 0
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN token_version INTEGER DEFAULT 0;
    `);

    console.log('Migration "add-token-version-to-users" applied successfully.');
  } catch (error) {
    console.error('Error applying migration "add-token-version-to-users":', error);
    throw error;
  }
};

export const down = async (pool: Pool): Promise<void> => {
  try {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN token_version;
    `);
    console.log('Migration "add-token-version-to-users" rolled back successfully.');
  } catch (error) {
    console.error('Error rolling back migration "add-token-version-to-users":', error);
    throw error;
  }
};
