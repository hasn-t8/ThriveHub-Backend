
/**
 * Image model and related operations.
 */
import pool from "../config/db";

export interface Image {
  id: number;
  blog_post_id: number;
  image_url: string;
  image_type: 'post' | 'gallery' | 'review';
  created_at: Date;
}export const uploadImage = async (
  entityId: number | null,
  imageUrl: string,
  imageType: 'post' | 'gallery' | 'review'
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO images (
      ${entityId !== null ? 'blog_post_id,' : ''}
      image_url, image_type
    )
    VALUES (
      ${entityId !== null ? '$1,' : ''} $${entityId !== null ? '2' : '1'}::text, $${entityId !== null ? '3' : '2'}
    )
    RETURNING id
    `,
    entityId !== null ? [entityId, imageUrl, imageType] : [imageUrl, imageType]
  );
  return result.rows[0].id;
};

/**
 * Get images for a blog post with an optional filter for image type
 */
export const getImagesForBlogPost = async (
  blogPostId: number,
  imageType?: 'post' | 'gallery' | 'review'
): Promise<Image[]> => {
  let query = `SELECT id, blog_post_id, image_url, image_type, created_at FROM images WHERE blog_post_id = $1`;
  const params: (number | string)[] = [blogPostId];

  if (imageType) {
    query += ` AND image_type = $2`;
    params.push(imageType);
  }

  const result = await pool.query(query, params);
  return result.rows;
};
