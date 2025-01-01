import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {

  // Add "approval_status" column
  await runColumnMigration(pool, "approval_status", "create", {
    tableName: "reviews",
    columnDefinition: "VARCHAR(50) DEFAULT 'pending'",
  });
};

export const down = async (pool: Pool) => {
  // Remove "approval_status" column
  await runColumnMigration(pool, "approval_status", "drop", {
    tableName: "reviews",
  });


};
