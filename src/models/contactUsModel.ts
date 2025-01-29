import pool from "../config/db";

export interface ContactUs {
  id: number;
  user_id: number | null;
  business_id: number | null;
  name: string;
  email: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export class ContactUsModel {
  // Create a new contact us message
  static async createContactUs(
    name: string,
    email: string,
    message: string,
    userId: number | null = null,
    businessId: number | null = null
  ): Promise<ContactUs> {
    if (!name || !email) {
      throw new Error("Name and email are required.");
    }

    // Validate the ID rules
    if ((userId && businessId) || (!userId && !businessId)) {
      throw new Error(
        "Exactly one of 'user_id' or 'business_id' must be provided."
      );
    }

    const result = await pool.query(
      `INSERT INTO contact_us (name, email, message, user_id, business_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, message, user_id, business_id, created_at, updated_at`,
      [name, email, message, userId, businessId]
    );

    return result.rows[0];
  }

  // Fetch all contact us entries
  static async getAllContactUs(): Promise<ContactUs[]> {
    const result = await pool.query(
      `SELECT * FROM contact_us ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Get contact us entries by user_id
  static async getContactUsByUserId(userId: number): Promise<ContactUs[]> {
    const result = await pool.query(
      `SELECT * FROM contact_us WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Get contact us entries by business_id
  static async getContactUsByBusinessId(businessId: number): Promise<ContactUs[]> {
    const result = await pool.query(
      `SELECT * FROM contact_us WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId]
    );
    return result.rows;
  }
}
