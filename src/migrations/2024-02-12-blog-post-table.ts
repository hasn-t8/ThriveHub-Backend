import { Pool } from "pg";

/**
 * Up migration: Create the `blog_posts` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `blog_posts` table
    await client.query(`
      CREATE TABLE blog_posts (
        id SERIAL PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- User who authored the post
        title VARCHAR(255) NOT NULL, -- Title of the blog post
        content TEXT NOT NULL, -- Main content of the blog post
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date and time the post was created
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date and time the post was last updated
        is_published BOOLEAN DEFAULT FALSE -- Indicates if the post is published
      );
    `);

    console.log("Table `blog_posts` created successfully.");

    // Add indexes for efficient querying
    await client.query(`CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);`);
    await client.query(`CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);`);

    console.log("Indexes for `blog_posts` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `blog_posts` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `blog_posts` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS blog_posts;`);
    console.log("Table `blog_posts` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `blog_posts` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
