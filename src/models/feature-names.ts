import pool from "../config/db";

/** --------------------- Feature Names Model --------------------- */
export interface FeatureName {
  id: number;
  name: string;
  created: Date;
  updated: Date;
  created_by: number;
  updated_by: number;
}

/** --------------------- Create Feature Name --------------------- */
export const createFeatureName = async (
  name: string,
  userId: number
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO feature_names (name, created_by, updated_by) 
    VALUES ($1, $2, $2) RETURNING id
    `,
    [name, userId]
  );
  return result.rows[0].id;
};

/** --------------------- Find Feature Names --------------------- */
export const findFeatureNames = async (): Promise<FeatureName[]> => {
  const result = await pool.query(`
    SELECT * FROM feature_names
  `);
  return result.rows;
};

/** --------------------- Find Feature Name By ID --------------------- */
export const findFeatureNameById = async (id: number): Promise<FeatureName | null> => {
  const result = await pool.query(
    `
    SELECT * FROM feature_names WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
};

/** --------------------- Update Feature Name --------------------- */
export const updateFeatureName = async (
  id: number,
  name: string,
  userId: number
): Promise<void> => {
  const result = await pool.query(
    `
    UPDATE feature_names 
    SET name = $1, updated_by = $2, updated = CURRENT_TIMESTAMP 
    WHERE id = $3 RETURNING id
    `,
    [name, userId, id]
  );
  if (result.rowCount === 0) {
    throw new Error("Feature Name not found");
  }
};

/** --------------------- Delete Feature Name --------------------- */
export const deleteFeatureName = async (id: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM feature_names WHERE id = $1 RETURNING id
    `,
    [id]
  );
  if (result.rowCount === 0) {
    throw new Error("Feature Name not found, or cannot be deleted");
  }
};
