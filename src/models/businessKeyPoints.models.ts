import pool from "../config/db";

/** --------------------- Business Key Points --------------------- */
export interface BusinessKeyPoint {
  id: number;
  business_profile_id: number;
  business_key_point_name_id: number;
  type: string;
  text: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

/** --------------------- Business Key Point Names --------------------- */
export interface BusinessKeyPointName {
  id: number;
  name: string;
  type: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

/** --------------------- Create Business Key Point --------------------- */
export const createBusinessKeyPoint = async (
  businessProfileId: number,
  keyPointNameId: number,
  type: string,
  text: string,
  userId: number
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO business_key_points (business_profile_id, business_key_point_name_id, type, text, created_by, updated_by) 
    VALUES ($1, $2, $3, $4, $5, $5) RETURNING id
    `,
    [businessProfileId, keyPointNameId, type, text, userId]
  );
  return result.rows[0].id;
};

/** --------------------- Update Business Key Point --------------------- */
export const updateBusinessKeyPoint = async (
  keyPointId: number,
  keyPointNameId: number,
  text: string,
  type: string,
  userId: number
): Promise<void> => {
  const result = await pool.query(
    `
    UPDATE business_key_points 
    SET business_key_point_name_id = $1, text = $2, type = $3, updated_by = $4, updated = CURRENT_TIMESTAMP 
    WHERE id = $5 RETURNING id
    `,
    [keyPointNameId, text, type, userId, keyPointId]
  );
  if (result.rowCount === 0) {
    throw new Error("Business Key Point not found");
  }
};


/** --------------------- Create Business Key Point Name --------------------- */
export const createBusinessKeyPointName = async (
  name: string,
  type: string,
  userId: number
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO business_key_point_names (name, type, created_by, updated_by) 
    VALUES ($1, $2, $3, $3) RETURNING id
    `,
    [name, type, userId]
  );
  return result.rows[0].id;
};

/** --------------------- Find Business Key Points By Business Profile --------------------- */
export const findBusinessKeyPointsByBusinessProfile = async (
  businessProfileId: number
): Promise<BusinessKeyPoint[]> => {
  const result = await pool.query(
    `
    SELECT 
      bkp.*,
      bkpn.name AS key_point_name,
      bkpn.type AS key_point_type
    FROM 
      business_key_points bkp
    INNER JOIN 
      business_key_point_names bkpn
    ON 
      bkp.business_key_point_name_id = bkpn.id
    WHERE 
      bkp.business_profile_id = $1
    `,
    [businessProfileId]
  );
  return result.rows;
};

/** --------------------- Find All Business Key Point Names --------------------- */
export const findAllBusinessKeyPointNames = async (): Promise<BusinessKeyPointName[]> => {
  const result = await pool.query(`
    SELECT * FROM business_key_point_names
  `);
  return result.rows;
};

/** --------------------- Delete Business Key Point --------------------- */
export const deleteBusinessKeyPoint = async (keyPointId: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM business_key_points WHERE id = $1 RETURNING id
    `,
    [keyPointId]
  );
  if (result.rowCount === 0) {
    throw new Error("Business Key Point not found");
  }
};

/** --------------------- Delete Business Key Point Name --------------------- */
export const deleteBusinessKeyPointName = async (keyPointNameId: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM business_key_point_names WHERE id = $1 RETURNING id
    `,
    [keyPointNameId]
  );
  if (result.rowCount === 0) {
    throw new Error("Business Key Point Name not found");
  }
};
