import pool from "../config/db";

export interface BlogPost {
  id: number;
  author_id: number;
  category_id: number | null; // Nullable in case a post is not assigned a category
  title: string;
  content: string;
  is_published: boolean;
  image_cover: string | null;
  image_thumbnail: string | null;
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
  isPublished: boolean,
  imageCover: string | null = null,
  imageThumbnail: string | null = null
): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO blog_posts (author_id, category_id, title, content, is_published, image_cover, image_thumbnail)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [authorId, categoryId, title, content, isPublished, imageCover, imageThumbnail]
  );
  return result.rows[0];
};

/**
 * Get all blog posts by a specific author
 */
export const getBlogByAuthorId = async (authorId: number): Promise<BlogPost[]> => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM blog_posts
       WHERE author_id = $1
       ORDER BY created_at DESC`,
      [authorId]
    );

    return result.rows as BlogPost[];
  } catch (error) {
    console.error("Error fetching blogs by author ID:", error);
    throw new Error("Failed to fetch blogs by author ID");
  }
};

/**
 * Get all blog posts
 */
export const getAllBlogPosts = async (): Promise<BlogPost[]> => {
  const result = await pool.query(
    `SELECT 
       bp.*, 
       c.name AS category_name
     FROM blog_posts bp
     LEFT JOIN categories c ON bp.category_id = c.id
     ORDER BY bp.created_at DESC`
  );
  return result.rows;
};

/**
 * Get all blog posts filtered by category
 */
export const getBlogPostsByCategory = async (categoryId: number): Promise<BlogPost[]> => {
  const result = await pool.query(
    `SELECT 
    bp.*, 
    c.name AS category_name
    FROM blog_posts bp
    LEFT JOIN categories c ON bp.category_id = c.id
    WHERE bp.category_id = $1
    ORDER BY bp.created_at DESC`,
    [categoryId]
  );
  return result.rows;
};

/**
 * Get a blog post by ID
 */
export const getBlogPostById = async (blogPostId: number): Promise<BlogPost | null> => {
  const result = await pool.query(
    `SELECT 
    bp.*, 
    c.name AS category_name
    FROM blog_posts bp
    LEFT JOIN categories c ON bp.category_id = c.id
    WHERE bp.id = $1`,
    [blogPostId]
  );

  // If no rows are returned, return null
  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Update a blog post
 */
export const updateBlogPost = async (
  id: number,
  title?: string,
  content?: string,
  isPublished?: boolean,
  categoryId?: number | null,
  imageCover?: string | null,
  imageThumbnail?: string | null
): Promise<BlogPost | null> => {
  const result = await pool.query(
    `UPDATE blog_posts
     SET 
       title = COALESCE($1, title),
       content = COALESCE($2, content),
       is_published = COALESCE($3, is_published),
       category_id = COALESCE($4, category_id),
       image_cover = COALESCE($5, image_cover),
       image_thumbnail = COALESCE($6, image_thumbnail),
       updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [title, content, isPublished, categoryId, imageCover, imageThumbnail, id]
  );
  return result.rows[0];
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
