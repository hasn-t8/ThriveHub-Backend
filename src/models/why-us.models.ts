import pool from "../config/db";

/** --------------------- Why Us --------------------- */
export interface WhyUs {
  id: number;
  business_profile_id: number;
  text: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
}

/** --------------------- Create Why Us --------------------- */
export const createWhyUs = async (
  businessProfileId: number,
  text: string,
  userId: number
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO why_us (business_profile_id, text, created_by, updated_by) 
    VALUES ($1, $2, $3, $3) RETURNING id
    `,
    [businessProfileId, text, userId]
  );
  return result.rows[0].id;
};

/** --------------------- Find Why Us By Business Profile --------------------- */
export const findWhyUsByBusinessProfile = async (
  businessProfileId: number
): Promise<WhyUs[]> => {
  const result = await pool.query(
    `
    SELECT * FROM why_us WHERE business_profile_id = $1
    `,
    [businessProfileId]
  );
  return result.rows;
};

/** --------------------- Delete Why Us --------------------- */
export const deleteWhyUs = async (whyUsId: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM why_us WHERE id = $1 RETURNING id
    `,
    [whyUsId]
  );
  if (result.rowCount === 0) {
    throw new Error("Why Us entry not found");
  }
};

/** --------------------- Update Why Us --------------------- */
export const updateWhyUs = async (
  whyUsId: number,
  text: string,
  userId: number
): Promise<void> => {
  const result = await pool.query(
    `
    UPDATE why_us 
    SET text = $1, updated_by = $2, updated = CURRENT_TIMESTAMP 
    WHERE id = $3 RETURNING id
    `,
    [text, userId, whyUsId]
  );
  if (result.rowCount === 0) {
    throw new Error("Why Us entry not found");
  }
};
