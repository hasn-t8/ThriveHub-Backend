import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  // Add `avg_rating` column
  await runColumnMigration(pool, "avg_rating", "create", {
    tableName: "profiles_business",
    columnDefinition: "NUMERIC(3, 2) DEFAULT 0",
  });

  // Add `total_reviews` column
  await runColumnMigration(pool, "total_reviews", "create", {
    tableName: "profiles_business",
    columnDefinition: "INTEGER DEFAULT 0",
  });
};

export const down = async (pool: Pool) => {
  // Remove `avg_rating` column
  await runColumnMigration(pool, "avg_rating", "drop", {
    tableName: "profiles_business",
  });

  // Remove `total_reviews` column
  await runColumnMigration(pool, "total_reviews", "drop", {
    tableName: "profiles_business",
  });
};
