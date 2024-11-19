import fs from "fs";
import path from "path";
import pool from "../config/db";

const MIGRATIONS_DIR = path.join(__dirname);

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

const runMigrations = async () => {
  try {
    console.log("Running migrations...");
    console.log(process.env.DB_HOST);
    // Ensure the migrations table exists
    await ensureMigrationsTable();
    
    const isProd = process.env.NODE_ENV === 'production';

    console.log('isProd:', isProd); 

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => {
        const extension = isProd ? '.js' : '.ts';
        return file.endsWith(extension) && file !== 'index.ts' && file !== 'index.js';
      })
      .sort();

    console.log('Migrations to run:', files); // Debug log

    const appliedMigrations = await pool.query(
      "SELECT filename FROM migrations"
    );
    const appliedFiles = appliedMigrations.rows.map((row) => row.filename);

    for (const file of files) {
      if (!appliedFiles.includes(file)) {
        console.log(`Running migration: ${file}`);
        const migration = require(path.join(MIGRATIONS_DIR, file));

        if (typeof migration.up !== "function") {
          throw new TypeError(`${file} does not export an "up" function`);
        }

        await migration.up(pool);

        // Record the migration in the migrations table
        await pool.query("INSERT INTO migrations (filename) VALUES ($1)", [
          file,
        ]);

        // Record the action in the logs_database table
        await pool.query(
          "INSERT INTO logs_database (action, filename) VALUES ($1, $2)",
          ["apply", file]
        );
      }
    }

    console.log("All migrations are up to date.");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
};

const rollbackLastMigration = async () => {
  try {
    const lastMigration = await pool.query(
      "SELECT filename FROM migrations ORDER BY applied_at DESC LIMIT 1"
    );

    if (lastMigration.rows.length === 0) {
      console.log("No migrations to rollback.");
      return;
    }

    const { filename } = lastMigration.rows[0];

    // Skip the logs_database migration
    if (filename === "2024-00-00-create-logs-database-table.ts") {
      console.log("Skipping rollback for logs_database migration.");
      return;
    }

    console.log(`Rolling back migration: ${filename}`);
    const migration = require(path.join(MIGRATIONS_DIR, filename));

    if (typeof migration.down !== "function") {
      throw new TypeError(`${filename} does not export a "down" function`);
    }

    await migration.down(pool);

    // Remove the migration record from the migrations table
    await pool.query("DELETE FROM migrations WHERE filename = $1", [filename]);

    // Record the rollback action in the logs_database table
    await pool.query(
      "INSERT INTO logs_database (action, filename) VALUES ($1, $2)",
      ["rollback", filename]
    );

    console.log(`Successfully rolled back migration: ${filename}`);
  } catch (error) {
    console.error("Error rolling back migration:", error);
    process.exit(1);
  }
};

if (process.argv.includes("rollback")) {
  rollbackLastMigration()
    .then(() => process.exit(0))
    .catch(console.error);
} else {
  runMigrations()
    .then(() => process.exit(0))
    .catch(console.error);
}

export { runMigrations, rollbackLastMigration };
