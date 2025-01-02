import pool from "../config/db";

/** --------------------- Checkouts --------------------- */
export interface Checkout {
  id: number;
  user_id: number;
  plan: string;
  plan_id: string;
  checkout_session_id: string;
  session_completed_status: string | null;
  failure_reason: string | null;
  metadata: object | null;
  created_at: Date;
  updated_at: Date;
}

/** --------------------- Create Checkout --------------------- */
export const createCheckout = async (
  userId: number,
  plan: string,
  planId: string,
  checkoutSessionId: string,
  sessionCompletedStatus: string,
  failureReason: string | null = null,
  metadata: object | null = null
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO checkouts 
      (user_id, plan, plan_id, checkout_session_id, session_completed_status, failure_reason, metadata) 
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING id
    `,
    [
      userId,
      plan,
      planId,
      checkoutSessionId,
      sessionCompletedStatus,
      failureReason,
      metadata,
    ]
  );
  return result.rows[0].id;
};

/** --------------------- Find Checkouts By User --------------------- */
export const findCheckoutsByUser = async (userId: number): Promise<Checkout[]> => {
  const result = await pool.query(
    `
    SELECT * FROM checkouts 
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows;
};

/** --------------------- Find Checkout By Session ID --------------------- */
export const findCheckoutBySessionId = async (
  checkoutSessionId: string
): Promise<Checkout | null> => {
  const result = await pool.query(
    `
    SELECT * FROM checkouts 
    WHERE checkout_session_id = $1
    `,
    [checkoutSessionId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

/** --------------------- Delete Checkout --------------------- */
export const deleteCheckout = async (checkoutId: number): Promise<void> => {
  const result = await pool.query(
    `
    DELETE FROM checkouts 
    WHERE id = $1 
    RETURNING id
    `,
    [checkoutId]
  );
  if (result.rowCount === 0) {
    throw new Error("Checkout not found");
  }
};

/** --------------------- Update Checkout --------------------- */
export const updateCheckout = async (
  checkoutId: string,
  updates: Partial<Checkout>
): Promise<void> => {
  const fields = Object.keys(updates)
    .map((field, index) => `${field} = $${index + 2}`)
    .join(", ");
  const values = [checkoutId, ...Object.values(updates)];

  const result = await pool.query(
    `
    UPDATE checkouts 
    SET ${fields}, updated_at = CURRENT_TIMESTAMP 
    WHERE checkout_session_id = $1 
    RETURNING id
    `,
    values
  );

  if (result.rowCount === 0) {
    throw new Error("Checkout not found");
  }
};
