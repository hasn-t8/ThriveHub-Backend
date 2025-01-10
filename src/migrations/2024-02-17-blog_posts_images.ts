import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  // Add "image_cover" column
  await runColumnMigration(pool, "image_cover", "create", {
    tableName: "blog_posts",
    columnDefinition: "TEXT",
  });

  // Add "image_thumbnail" column
  await runColumnMigration(pool, "image_thumbnail", "create", {
    tableName: "blog_posts",
    columnDefinition: "TEXT",
  });
};

export const down = async (pool: Pool) => {
  // Remove "image_cover" column
  await runColumnMigration(pool, "image_cover", "drop", {
    tableName: "blog_posts",
  });

  // Remove "image_thumbnail" column
  await runColumnMigration(pool, "image_thumbnail", "drop", {
    tableName: "blog_posts",
  });
};
