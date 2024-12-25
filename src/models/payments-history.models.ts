import pool from "../config/db";

export interface PaymentHistory {
  id: number;
  user_id: number;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: Date;
}

/** --------------------- Record Payment --------------------- */
export const recordPayment = async (
  userId: number,
  stripePaymentIntentId: string,
  amount: number,
  currency: string,
  status: string
): Promise<number> => {
  const result = await pool.query(
    `
      INSERT INTO payment_history 
        (user_id, stripe_payment_intent_id, amount, currency, status) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id
      `,
    [userId, stripePaymentIntentId, amount, currency, status]
  );
  return result.rows[0].id;
};

/** --------------------- Get Payment History By User --------------------- */
export const getPaymentHistoryByUser = async (userId: number): Promise<PaymentHistory[]> => {
  const result = await pool.query(
    `
      SELECT * FROM payment_history 
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
    [userId]
  );
  return result.rows;
};
