import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  await runColumnMigration(pool, "full_name", "create", {
    tableName: "users",
    columnDefinition: "VARCHAR(255)",
  });
};

export const down = async (pool: Pool) => {
  await runColumnMigration(pool, "full_name", "drop", {
    tableName: "users",
  });
};
