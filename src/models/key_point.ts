import pool from "../config/db";

export const createKeyPoint = async (
  name: string,
  text: string,
  createdBy: number,
  parentType: string,
  parentId: number
) => {
  const result = await pool.query(
    `
    INSERT INTO key_point (name, text, created_by, parent_type, parent_id, updated_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;
  `,
    [name, text, createdBy, parentType, parentId]
  );
  return result.rows[0];
};

export const getKeyPoints = async () => {
  const result = await pool.query("SELECT * FROM key_point");
  return result.rows;
};

export const updateKeyPoint = async (
  id: number,
  updatedBy: number,
  name: string,
  text: string,
  parentType: string,
  parentId: number
) => {
  const result = await pool.query(
    `
    UPDATE key_point 
    SET name = $1, text = $2, parent_type = $3, parent_id = $4, updated_by = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 RETURNING *;
  `,
    [name, text, parentType, parentId, updatedBy, id]
  );
  return result.rows[0];
};

export const deleteKeyPoint = async (id: number) => {
  const result = await pool.query("DELETE FROM key_point WHERE id = $1 RETURNING *;", [id]);
  return result.rows[0];
};
