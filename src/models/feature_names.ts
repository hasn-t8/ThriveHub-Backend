import pool from "../config/db";

export const createFeatureName = async (name: string, createdBy: number) => {
  const result = await pool.query(
    `
    INSERT INTO feature_names (name, created_by, updated_by, created_at, updated_at)
    VALUES ($1, $2, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;
  `,
    [name, createdBy]
  );
  return result.rows[0];
};

export const getFeatureNames = async () => {
  const result = await pool.query("SELECT * FROM feature_names");
  return result.rows;
};

export const updateFeatureName = async (id: number, updatedBy: number, name: string) => {
  const result = await pool.query(
    `
    UPDATE feature_names 
    SET name = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 RETURNING *; 
  `,
    [name, updatedBy, id]
  );
  return result.rows[0];
};

export const deleteFeatureName = async (id: number) => {
  const result = await pool.query("DELETE FROM feature_names WHERE id = $1 RETURNING *;", [id]);
  return result.rows[0];
};
