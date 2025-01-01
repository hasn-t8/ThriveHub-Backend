import pool from "../config/db";

export interface BlogPost {
  id: number;
  author_id: number;
  title: string;
  content: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new blog post
 */
export const createBlogPost = async (
  authorId: number,
  title: string,
  content: string,
  isPublished: boolean
): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO blog_posts (author_id, title, content, is_published)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [authorId, title, content, isPublished]
  );
  return result.rows[0].id;
};

/**
 * Get all blog posts
 */
export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  const result = await pool.query(
    `SELECT id, author_id, title, content, is_published, created_at, updated_at
     FROM blog_posts
     ORDER BY created_at DESC`
  );
  return result.rows;
};

/**
 * Update a blog post
 */
export const updateBlogPost = async (
  id: number,
  title?: string,
  content?: string,
  isPublished?: boolean
): Promise<BlogPost | null> => {
  const result = await pool.query(
    `UPDATE blog_posts
     SET 
       title = COALESCE($1, title),
       content = COALESCE($2, content),
       is_published = COALESCE($3, is_published),
       updated_at = NOW()
     WHERE id = $4
     RETURNING id, author_id, title, content, is_published, created_at, updated_at`,
    [title, content, isPublished, id]
  );
  return result.rowCount && result.rowCount > 0 ? result.rows[0] : null;
};

/**
 * Delete a blog post
 */
export const deleteBlogPost = async (id: number): Promise<void> => {
  const result = await pool.query(`DELETE FROM blog_posts WHERE id = $1 RETURNING *`, [id]);
  if (!result.rowCount || result.rowCount === 0) {
    throw new Error("Blog post not found");
  }
};
