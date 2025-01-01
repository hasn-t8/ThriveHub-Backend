import { Pool } from "pg";

/**
 * Migration to add images table with support for image types.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create the images table
    await client.query(`
      CREATE TABLE images (
        id SERIAL PRIMARY KEY,
        blog_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('post', 'gallery', 'review')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Table \`images\` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating \`images\` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Migration to drop the images table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS images;`);
    console.log("Table \`images\` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping \`images\` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
