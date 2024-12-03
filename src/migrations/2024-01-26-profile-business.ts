import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  await runColumnMigration(pool, "views", "create", {
    tableName: "profiles_business",
    columnDefinition: "INTEGER DEFAULT 0",
  });
};

export const down = async (pool: Pool) => {
  await runColumnMigration(pool, "views", "drop", {
    tableName: "profiles_business",
  });
};
