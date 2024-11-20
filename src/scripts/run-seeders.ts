import { seedUserTypes } from '../seeds/seed-user-types';
import { seedAdmin } from '../seeds/seed-admin';
import pool from '../config/db';

const runSeeders = async () => {
  try {
    console.log('Running seeders...');

    // Seed user types
    await seedUserTypes();

    // Seed admin user
    await seedAdmin();

    console.log('Seeders executed successfully.');
  } catch (error) {
    console.error('Error running seeders:', error);
  } finally {
    // Ensure the database connection is closed after seeding
    await pool.end();
  }
};

runSeeders();
