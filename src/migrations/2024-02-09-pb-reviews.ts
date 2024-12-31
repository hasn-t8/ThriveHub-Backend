import { Pool } from "pg";
import { runColumnMigration } from "../helpers/migrationHelper";

export const up = async (pool: Pool) => {
  await runColumnMigration(pool, "likes_total", "create", {
    tableName: "reviews",
    columnDefinition: "INTEGER DEFAULT 0",
  });
  
};

export const down = async (pool: Pool) => {
  await runColumnMigration(pool, "likes_total", "drop", {
    tableName: "reviews",
  });
};

// GET should return published, date(age), org_name, review, rating, likes, and shares for the review, image_gallery
//TODO: create image_gallery table with type_tags(reviews, profile, org), image_url, and created_at
