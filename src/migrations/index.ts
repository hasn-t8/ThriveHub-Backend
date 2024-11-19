import fs from 'fs';
import path from 'path';
import pool from '../config/db';

const MIGRATIONS_DIR = path.join(__dirname);

const runMigrations = async () => {
  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.ts') && file !== 'index.ts') // Exclude index.ts
      .sort();

    const appliedMigrations = await pool.query('SELECT filename FROM migrations');
    const appliedFiles = appliedMigrations.rows.map(row => row.filename);

    for (const file of files) {
      if (!appliedFiles.includes(file)) {
        console.log(`Running migration: ${file}`);
        const migration = require(path.join(MIGRATIONS_DIR, file));

        if (typeof migration.up !== 'function') {
          throw new TypeError(`${file} does not export an "up" function`);
        }

        await migration.up(pool);

        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      }
    }

    console.log('All migrations are up to date.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
};

const rollbackLastMigration = async () => {
  try {
    const lastMigration = await pool.query(
      'SELECT filename FROM migrations ORDER BY applied_at DESC LIMIT 1'
    );

    if (lastMigration.rows.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    const { filename } = lastMigration.rows[0];
    console.log(`Rolling back migration: ${filename}`);
    const migration = require(path.join(MIGRATIONS_DIR, filename));

    if (typeof migration.down !== 'function') {
      throw new TypeError(`${filename} does not export a "down" function`);
    }

    await migration.down(pool);

    await pool.query('DELETE FROM migrations WHERE filename = $1', [filename]);
  } catch (error) {
    console.error('Error rolling back migration:', error);
    process.exit(1);
  }
};

if (process.argv.includes('rollback')) {
  rollbackLastMigration().then(() => process.exit(0)).catch(console.error);
} else {
  runMigrations().then(() => process.exit(0)).catch(console.error);
}

export { runMigrations, rollbackLastMigration };
