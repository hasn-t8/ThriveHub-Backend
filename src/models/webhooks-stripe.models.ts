import pool from "../config/db";
import Stripe from "stripe";

export interface WebhookEvent {
    id: number;
    stripe_event_id: string;
    type: string;
    payload: object;
    created_at: Date;
  }
  
  /** --------------------- Record Webhook Event --------------------- */
  export const recordWebhookEvent = async (
    stripeEventId: string,
    type: string,
    payload: object
  ): Promise<number> => {
    const result = await pool.query(
      `
      INSERT INTO webhook_events 
        (stripe_event_id, type, payload) 
      VALUES ($1, $2, $3) 
      RETURNING id
      `,
      [stripeEventId, type, payload]
    );
    return result.rows[0].id;
  };
  
  /** --------------------- Get Webhook Events --------------------- */
  export const getWebhookEvents = async (limit = 100): Promise<WebhookEvent[]> => {
    const result = await pool.query(
      `
      SELECT * FROM webhook_events
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );
    return result.rows;
  };

/** --------------------- Handle Subscription Created --------------------- */
export const handleSubscriptionCreated = async (
  userId: number,
  subscription: Stripe.Subscription
): Promise<void> => {
  const status = subscription.status;
  const plan = subscription.items.data[0]?.price.id;
  const startDate = new Date(subscription.start_date * 1000);
  const nextBillingDate = new Date(subscription.current_period_end * 1000); // For next_billing_date

  await pool.query(
    `
    INSERT INTO subscriptions 
      (user_id, stripe_subscription_id, plan, status, start_date, next_billing_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (stripe_subscription_id) DO NOTHING
    `,
    [userId, subscription.id, plan, status, startDate, nextBillingDate]
  );
};

/** --------------------- Handle Subscription Updated --------------------- */
export const handleSubscriptionUpdated = async (
  userId: number,
  subscription: Stripe.Subscription
): Promise<void> => {
  const status = subscription.status;
  const nextBillingDate = new Date(subscription.current_period_end * 1000);
  const stripeSubscriptionId = subscription.id;

  await pool.query(
    `
    UPDATE subscriptions
    SET status = $1, next_billing_date = $2
    WHERE stripe_subscription_id = $3 AND user_id = $4
    `,
    [status, nextBillingDate, stripeSubscriptionId, userId]
  );
};

/** --------------------- Handle Subscription Deleted --------------------- */
export const handleSubscriptionDeleted = async (
  userId: number,
  subscriptionId: string
): Promise<void> => {
  await pool.query(
    `
    UPDATE subscriptions
    SET status = 'canceled'
    WHERE stripe_subscription_id = $1 AND user_id = $2
    `,
    [subscriptionId, userId]
  );
};

