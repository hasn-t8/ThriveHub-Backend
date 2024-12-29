import pool from "../config/db";

export interface Profile {
  id: number;
  user_id: number;
  profile_type: "personal" | "business";
  created_at: Date;
  updated_at: Date;
}

/**
 * Validates if the business profile ID belongs to the user.
 * @param userId The user ID
 * @param businessProfileId The business profile ID
 * @returns The organization name if valid, null otherwise
 */
export async function validateBusinessProfileOwnership(
  userId: number,
  businessProfileId: number
): Promise<string | null> {
  const query = `
    SELECT pb.id
    FROM profiles_business pb
    JOIN profiles p ON pb.profile_id = p.id
    WHERE p.user_id = $1 AND pb.id = $2
    LIMIT 1;
  `;

  try {
    const result = await pool.query(query, [userId, businessProfileId]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error("Error validating business profile ownership:", error);
    throw error;
  }
}

/**
 * Create a new business profile.
 */
export const createBusinessProfile = async (userId: number, data: any) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkOrgName = await client.query(
      `SELECT id FROM profiles_business WHERE org_name = $1`,
      [data.org_name]
    );
    if (checkOrgName.rowCount && checkOrgName.rowCount > 0) {
      throw new Error("Organization name already exists");
    }

    let profileId;
    const profileResult = await client.query(
      `SELECT id FROM profiles WHERE user_id = $1 AND profile_type = 'business'`,
      [userId]
    );

    if (profileResult.rowCount && profileResult.rowCount > 0) {
      profileId = profileResult.rows[0].id;
    } else {
      const newProfileResult = await client.query(
        `INSERT INTO profiles (user_id, profile_type) 
         VALUES ($1, 'business') RETURNING id`,
        [userId]
      );
      profileId = newProfileResult.rows[0].id;
    }

    const newBusinessProfileResult = await client.query(
      `INSERT INTO profiles_business (
        profile_id, business_website_url, org_name, job_title, 
        work_email, category, logo_url, about_business, work_email_verified, business_website_title
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        profileId,
        data.business_website_url,
        data.org_name,
        data.job_title,
        data.work_email,
        data.category,
        data.logo_url,
        data.about_business,
        data.work_email_verified || false,
        data.business_website_title,
      ]
    );

    const businessProfileId = newBusinessProfileResult.rows[0].id;

    await client.query("COMMIT");
    return { profileId, businessProfileId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update an existing business profile.
 */
export const updateBusinessProfile = async (businessProfileId: number, data: any) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Dynamically construct the SET clause and parameters
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    // Add the businessProfileId as the last parameter
    values.push(businessProfileId);

    const query = `
      UPDATE profiles_business
      SET ${fields.join(", ")}
      WHERE id = $${index}
      RETURNING profile_id, id
    `;

    const businessProfileResult = await client.query(query, values);

    if (businessProfileResult.rowCount === 0) {
      throw new Error("Business profile not found");
    }

    const { profile_id: profileId } = businessProfileResult.rows[0];

    await client.query("COMMIT");
    return { profileId, businessProfileId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all business profiles for a user.
 */
export const getBusinessProfilesByUserId = async (userId: number) => {
  const query = `
    SELECT 
      u.full_name,
      u.email,
      p.id AS profile_id, 
      p.profile_type, 
      pb.*
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id AND p.profile_type = 'business'
    LEFT JOIN profiles_business pb ON p.id = pb.profile_id
    WHERE u.id = $1
  `;

  const result = await pool.query(query, [userId]);

  const businessProfiles = result.rows.filter((row) => row.profile_id !== null);
  return businessProfiles.length > 0 ? businessProfiles : null;
};

/**
 * Delete a business profile.
 */
export const deleteBusinessProfile = async (businessProfileId: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const profileResult = await client.query("SELECT id FROM profiles_business WHERE id = $1", [
      businessProfileId,
    ]);

    if (profileResult.rowCount === 0) {
      throw new Error("Business Profile not found");
    }

    await client.query("DELETE FROM profiles_business WHERE id = $1", [businessProfileId]);

    await client.query("COMMIT");
    console.log("Successfully deleted business profile with ID:", businessProfileId);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting business profile:", error);
    throw error;
  } finally {
    client.release();
  }
};

export const getAllBusinessProfiles = async () => {
  const query = `
    SELECT 
      p.id AS profile_id,
      pb.id AS business_profile_id,
      pb.*
    FROM profiles p
    INNER JOIN profiles_business pb ON p.id = pb.profile_id
    WHERE p.profile_type = 'business'
    ORDER BY pb.id ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

export const getBusinessProfileByBusinessProfileId = async (
  businessProfileId: number
): Promise<any | null> => {
  const query = `
    SELECT 
      p.id AS profile_id, 
      pb.id AS business_profile_id, 
      pb.*
    FROM profiles p
    INNER JOIN profiles_business pb ON p.id = pb.profile_id
    WHERE p.profile_type = 'business' AND pb.id = $1
  `;

  const result = await pool.query(query, [businessProfileId]);

  return result.rows.length > 0 ? result.rows[0] : null;
};
