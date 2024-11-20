import pool from '../config/db';

export const seedUserTypes = async (): Promise<void> => {
  const userTypes = ['registered-user', 'business-owner', 'team-member'];

  for (const type of userTypes) {
    const result = await pool.query('SELECT id FROM user_types WHERE type = $1', [type]);

    if (result.rowCount === 0) {
      // Type does not exist, insert it
      await pool.query('INSERT INTO user_types (type) VALUES ($1)', [type]);
      console.log(`Inserted user type: ${type}`);
    } else {
      console.log(`User type already exists: ${type}`);
    }
  }

  console.log('User types seeded successfully.');
};
