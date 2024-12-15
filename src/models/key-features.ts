import pool from "../config/db";

/** --------------------- Key Features --------------------- */
export interface KeyFeature {
  id: number;
  business_profile_id: number;
  text: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

/** --------------------- Feature Names --------------------- */
export interface FeatureName {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

/** --------------------- Create Key Feature --------------------- */
export const createKeyFeature = async (
  businessProfileId: number,
  text: string,
  userId: number
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO key_features (business_profile_id, text, created_by, updated_by) 
    VALUES ($1, $2, $3, $3) RETURNING id
    `,
    [businessProfileId, text, userId]
  );
  return result.rows[0].id;
};

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

/** --------------------- Find Key Features By Business Profile --------------------- */
export const findKeyFeaturesByBusinessProfile = async (
  businessProfileId: number
): Promise<KeyFeature[]> => {
  const result = await pool.query(
    `
    SELECT * FROM key_features WHERE business_profile_id = $1
    `,
    [businessProfileId]
  );
  return result.rows;
};

/** --------------------- Find Feature Names --------------------- */
export const findFeatureNames = async (): Promise<FeatureName[]> => {
  const result = await pool.query(`
    SELECT * FROM feature_names
  `);
  return result.rows;
};

/** --------------------- Delete Key Feature --------------------- */
export const deleteKeyFeature = async (keyFeatureId: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM key_features WHERE id = $1 RETURNING id
    `,
    [keyFeatureId]
  );
  if (result.rowCount === 0) {
    throw new Error("Key Feature not found");
  }
};

/** --------------------- Delete Feature Name --------------------- */
export const deleteFeatureName = async (featureNameId: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM feature_names WHERE id = $1 RETURNING id
    `,
    [featureNameId]
  );
  if (result.rowCount === 0) {
    throw new Error("Feature Name not found");
  }
};

/** --------------------- Update Key Feature --------------------- */
export const updateKeyFeature = async (
  keyFeatureId: number,
  text: string,
  userId: number
): Promise<void> => {
  const result = await pool.query(
    `
    UPDATE key_features 
    SET text = $1, updated_by = $2, updated = CURRENT_TIMESTAMP 
    WHERE id = $3 RETURNING id
    `,
    [text, userId, keyFeatureId]
  );
  if (result.rowCount === 0) {
    throw new Error("Key Feature not found");
  }
};
