import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  // Add new columns to the profiles_personal table
  await runColumnMigration(pool, "date_of_birth", "create", {
    tableName: "profiles_personal",
    columnDefinition: "DATE",
  });
  await runColumnMigration(pool, "phone_number", "create", {
    tableName: "profiles_personal",
    columnDefinition: "VARCHAR(15)", // Adjust length as needed
  });
  await runColumnMigration(pool, "address_line_1", "create", {
    tableName: "profiles_personal",
    columnDefinition: "VARCHAR(255)",
  });
  await runColumnMigration(pool, "address_line_2", "create", {
    tableName: "profiles_personal",
    columnDefinition: "VARCHAR(255)",
  });
  await runColumnMigration(pool, "address_city", "create", {
    tableName: "profiles_personal",
    columnDefinition: "VARCHAR(100)",
  });
  await runColumnMigration(pool, "address_zip_code", "create", {
    tableName: "profiles_personal",
    columnDefinition: "VARCHAR(20)",
  });
  await runColumnMigration(pool, "img_profile_url", "create", {
    tableName: "profiles_personal",
    columnDefinition: "VARCHAR(255)",
  });
};

export const down = async (pool: Pool) => {
  // Drop new columns from the profiles_personal table
  await runColumnMigration(pool, "date_of_birth", "drop", {
    tableName: "profiles_personal",
  });
  await runColumnMigration(pool, "phone_number", "drop", {
    tableName: "profiles_personal",
  });
  await runColumnMigration(pool, "address_line_1", "drop", {
    tableName: "profiles_personal",
  });
  await runColumnMigration(pool, "address_line_2", "drop", {
    tableName: "profiles_personal",
  });
  await runColumnMigration(pool, "address_city", "drop", {
    tableName: "profiles_personal",
  });
  await runColumnMigration(pool, "address_zip_code", "drop", {
    tableName: "profiles_personal",
  });
  await runColumnMigration(pool, "img_profile_url", "drop", {
    tableName: "profiles_personal",
  });
};
