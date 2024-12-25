import pool from "../config/db";

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
  