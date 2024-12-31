import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  await runColumnMigration(pool, "stripe_customer_id", "create", {
    tableName: "users",
    columnDefinition: "VARCHAR(255)",
  });

  await runColumnMigration(pool, "subscription_status", "create", {
    tableName: "users",
    columnDefinition: "VARCHAR(50)",
  });
};

export const down = async (pool: Pool) => {
  await runColumnMigration(pool, "stripe_customer_id", "drop", {
    tableName: "users",
  });

  await runColumnMigration(pool, "subscription_status", "drop", {
    tableName: "users",
  });
};
