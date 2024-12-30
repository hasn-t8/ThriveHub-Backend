import pool from "../config/db";

export interface Like {
  id: number;
  entity_type: string; // e.g., 'post', 'comment', 'reviews'
  entity_id: number;
  user_id: number;
  created_at: Date;
}

/** --------------------- Add Like --------------------- */
export const addLike = async (
  entityType: string,
  entityId: number,
  userId: number
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO likes (entity_type, entity_id, user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING
    RETURNING id
    `,
    [entityType, entityId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Like already exists or could not be added.");
  }

  return result.rows[0].id;
};

/** --------------------- Remove Like --------------------- */
export const removeLike = async (
  entityType: string,
  entityId: number,
  userId: number
): Promise<void> => {
  await pool.query(
    `
    DELETE FROM likes
    WHERE entity_type = $1 AND entity_id = $2 AND user_id = $3
    `,
    [entityType, entityId, userId]
  );
};

/** --------------------- Get Likes for Entity --------------------- */
export const getLikesForEntity = async (
  entityType: string,
  entityId: number
): Promise<number> => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS like_count
    FROM likes
    WHERE entity_type = $1 AND entity_id = $2
    `,
    [entityType, entityId]
  );

  return parseInt(result.rows[0].like_count, 10);
};

/** --------------------- Get Liked Entities by User --------------------- */
export const getLikedEntitiesByUser = async (
  userId: number,
  entityType?: string
): Promise<Like[]> => {
  const query = entityType
    ? `
      SELECT * FROM likes
      WHERE user_id = $1 AND entity_type = $2
      `
    : `
      SELECT * FROM likes
      WHERE user_id = $1
      `;

  const result = await pool.query(query, entityType ? [userId, entityType] : [userId]);
  return result.rows;
};
