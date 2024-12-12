import pool from "../config/db";

export const createWhyUs = async (businessId: number, createdBy: number) => {
  const result = await pool.query(`
    INSERT INTO why_us (business_id, created_by, updated_by, created_at, updated_at)
    VALUES ($1, $2, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;
  `, [businessId, createdBy]);
  return result.rows[0];
};

export const getWhyUs = async () => {
  const result = await pool.query('SELECT * FROM why_us');
  return result.rows;
};

export const updateWhyUs = async (id: number, updatedBy: number, businessId: number) => {
  const result = await pool.query(`
    UPDATE why_us 
    SET business_id = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $3 RETURNING *;
  `, [businessId, updatedBy, id]);
  return result.rows[0];
};

export const deleteWhyUs = async (id: number) => {
  const result = await pool.query('DELETE FROM why_us WHERE id = $1 RETURNING *;', [id]);
  return result.rows[0];
};
