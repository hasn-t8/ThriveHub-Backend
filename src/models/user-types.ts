import pool from '../config/db';

export const isUserTypesTableEmpty = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS count FROM user_types');
    const count = parseInt(result.rows[0].count, 10);
    return count === 0;
  } catch (error) {
    console.error('Error checking user_types table:', error);
    throw error;
  }
};

export const addUserType = async (type: string): Promise<void> => {
  try {
    await pool.query('INSERT INTO user_types (type) VALUES ($1)', [type]);
    console.log(`Inserted user type: ${type}`);
  } catch (error) {
    console.error(`Error adding user type "${type}":`, error);
    throw error;
  }
};
