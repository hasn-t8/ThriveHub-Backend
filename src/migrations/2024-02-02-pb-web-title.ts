import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  await runColumnMigration(pool, "business_website_title", "create", {
    tableName: "profiles_business",
    columnDefinition: "VARCHAR(255)",
  });
};

export const down = async (pool: Pool) => {
  await runColumnMigration(pool, "business_website_title", "drop", {
    tableName: "profiles_business",
  });
};
