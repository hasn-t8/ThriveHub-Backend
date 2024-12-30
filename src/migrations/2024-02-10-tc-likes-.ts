import { Pool } from "pg";

/**
 * Up migration: Create the `likes` table.
 */
export const up = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create `likes` table
    await client.query(`
      CREATE TABLE likes (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL, -- Type of entity being liked, e.g., 'post', 'comment', 'reviews'
        entity_id INT NOT NULL,          -- ID of the specific entity being liked
        user_id INT NOT NULL,            -- ID of the user who liked the entity
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (entity_type, entity_id, user_id) -- Ensure a user can like an entity only once
      );
    `);

    console.log("Table `likes` created successfully.");

    // Add indexes
    await client.query(`CREATE INDEX idx_likes_entity ON likes(entity_type, entity_id);`);
    await client.query(`CREATE INDEX idx_likes_user ON likes(user_id);`);

    console.log("Indexes for `likes` created successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating `likes` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Down migration: Drop the `likes` table.
 */
export const down = async (pool: Pool) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DROP TABLE IF EXISTS likes;`);
    console.log("Table `likes` dropped successfully.");

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error dropping `likes` table:", (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
