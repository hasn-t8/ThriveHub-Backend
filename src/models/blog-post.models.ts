import pool from "../config/db";

export interface BlogPost {
  id: number;
  author_id: number;
  category_id: number | null; // Nullable in case a post is not assigned a category
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
  categoryId: number | null,
  title: string,
  content: string,
  isPublished: boolean
): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO blog_posts (author_id, category_id, title, content, is_published)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [authorId, categoryId, title, content, isPublished]
  );
  return result.rows[0].id;
};

/**
 * Get all blog posts
 */
export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  const result = await pool.query(
    `SELECT id, author_id, category_id, title, content, is_published, created_at, updated_at
     FROM blog_posts
     ORDER BY created_at DESC`
  );
  return result.rows;
};

/**
 * Get all blog posts filtered by category
 */
export const getBlogPostsByCategory = async (categoryId: number): Promise<BlogPost[]> => {
  const result = await pool.query(
    `SELECT id, author_id, category_id, title, content, is_published, created_at, updated_at
     FROM blog_posts
     WHERE category_id = $1
     ORDER BY created_at DESC`,
    [categoryId]
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
  isPublished?: boolean,
  categoryId?: number | null
): Promise<BlogPost | null> => {
  const result = await pool.query(
    `UPDATE blog_posts
     SET 
       title = COALESCE($1, title),
       content = COALESCE($2, content),
       is_published = COALESCE($3, is_published),
       category_id = COALESCE($4, category_id),
       updated_at = NOW()
     WHERE id = $5
     RETURNING id, author_id, category_id, title, content, is_published, created_at, updated_at`,
    [title, content, isPublished, categoryId, id]
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
