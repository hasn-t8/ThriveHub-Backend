import pool from "../config/db";

export interface Subscription {
  id: number;
  user_id: number;
  stripe_subscription_id: string;
  plan: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  next_billing_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Retrieves all active or currently valid subscriptions for a given user.
 * Includes subscriptions that are canceled but still valid until the end of the current period.
 * @param userId - The ID of the user.
 * @returns An array of active subscriptions, or an empty array if none exist.
 */
export const getAllActiveSubscriptions = async (userId: number): Promise<Subscription[]> => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM subscriptions
      WHERE user_id = $1
        AND end_date > NOW()::TIMESTAMP -- Ensure the end date is in the future
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows; // Return all matching subscriptions
  } catch (error) {
    console.error("Error retrieving active subscriptions:", error);
    throw error;
  }
};

/** --------------------- Create Subscription --------------------- */
export const createSubscription = async (
  userId: number,
  stripeSubscriptionId: string,
  plan: string,
  status: string,
  startDate: Date,
  nextBillingDate?: Date,
  endDate?: Date
): Promise<number> => {
  const result = await pool.query(
    `
    INSERT INTO subscriptions
      (user_id, stripe_subscription_id, plan, status, start_date, end_date, next_billing_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
    `,
    [userId, stripeSubscriptionId, plan, status, startDate, endDate, nextBillingDate]
  );
  return result.rows[0].id;
};

/** --------------------- Get Subscriptions By User --------------------- */
export const getSubscriptionsByUser = async (userId: number): Promise<Subscription[]> => {
  const result = await pool.query(
    `
    SELECT * FROM subscriptions 
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows;
};

// /** --------------------- Update Subscription --------------------- */
export const updateSubscription = async (
  subscriptionId: number,
  updates: Partial<Subscription>
): Promise<void> => {
  const fields = Object.keys(updates)
    .map((field, index) => `${field} = $${index + 2}`)
    .join(", ");

  const values = [subscriptionId, ...Object.values(updates)];

  await pool.query(
    `
    UPDATE subscriptions
    SET ${fields}
    WHERE id = $1
    `,
    values
  );
};

/** --------------------- Delete Subscription --------------------- */
export const deleteSubscription = async (subscriptionId: number): Promise<void> => {
  await pool.query(`DELETE FROM subscriptions WHERE id = $1`, [subscriptionId]);
};

export const canceSubscription = async (subscriptionId: string, cancelAt: Date): Promise<void> => {
  await pool.query(
    `
    UPDATE subscriptions
    SET status = 'canceled', end_date = $2
    WHERE stripe_subscription_id = $1
    `,
    [subscriptionId, cancelAt]
  );
};

/** --------------------- Get Subscription By Stripe ID --------------------- */
export const getSubscriptionByStripeId = async (
  stripeSubscriptionId: string
): Promise<Subscription | null> => {
  const result = await pool.query(
    `
    SELECT * FROM subscriptions 
    WHERE stripe_subscription_id = $1
    `,
    [stripeSubscriptionId]
  );
  return result.rows[0] || null;
};
