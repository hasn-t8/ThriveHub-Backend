import pool from "../config/db";

export const createKeyFeature = async (businessId: number, createdBy: number) => {
  const result = await pool.query(
    `
    INSERT INTO key_features (business_id, created_by, updated_by, created_at, updated_at)
    VALUES ($1, $2, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;
  `,
    [businessId, createdBy]
  );
  return result.rows[0];
};

export const getKeyFeatures = async () => {
  const result = await pool.query("SELECT * FROM key_features");
  return result.rows;
};

export const updateKeyFeature = async (id: number, updatedBy: number, businessId: number) => {
  const result = await pool.query(
    `
    UPDATE key_features 
    SET business_id = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $3 RETURNING *;
  `,
    [businessId, updatedBy, id]
  );
  return result.rows[0];
};

export const deleteKeyFeature = async (id: number) => {
  const result = await pool.query("DELETE FROM key_features WHERE id = $1 RETURNING *;", [id]);
  return result.rows[0];
};
