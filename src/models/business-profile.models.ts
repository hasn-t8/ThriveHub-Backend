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
        work_email, category, logo_url, about_business, work_email_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    const businessProfileResult = await client.query(
      `UPDATE profiles_business 
       SET business_website_url = $1, org_name = $2, job_title = $3, 
           work_email = $4, category = $5, logo_url = $6, about_business = $7, 
           work_email_verified = $8
       WHERE id = $9
       RETURNING profile_id, id`,
      [
        data.business_website_url,
        data.org_name,
        data.job_title,
        data.work_email,
        data.category,
        data.logo_url,
        data.about_business,
        data.work_email_verified || false,
        businessProfileId,
      ]
    );

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
      pb.business_website_url, 
      pb.org_name, 
      pb.job_title, 
      pb.work_email, 
      pb.category, 
      pb.logo_url, 
      pb.about_business, 
      pb.work_email_verified
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
export const deleteBusinessProfile = async (profileId: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const profileResult = await client.query(
      "SELECT id FROM profiles WHERE id = $1 AND profile_type = 'business'",
      [profileId]
    );

    if (profileResult.rowCount === 0) {
      throw new Error("Profile not found");
    }

    await client.query("DELETE FROM profiles_business WHERE profile_id = $1", [profileId]);
    await client.query("DELETE FROM profiles WHERE id = $1", [profileId]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getAllBusinessProfiles = async (): Promise<any[]> => {
  const query = `
    SELECT 
      p.id AS profile_id, 
      pb.business_website_url, 
      pb.org_name, 
      pb.job_title, 
      pb.work_email, 
      pb.category, 
      pb.logo_url, 
      pb.about_business, 
      pb.work_email_verified
    FROM profiles p
    INNER JOIN profiles_business pb ON p.id = pb.profile_id
    WHERE p.profile_type = 'business'
  `;

  const result = await pool.query(query);
  return result.rows;
};

export const getBusinessProfileByBusinessProfileId = async (businessProfileId: number): Promise<any | null> => {
  const query = `
    SELECT 
      pb.id AS business_profile_id, 
      p.id AS profile_id, 
      pb.business_website_url, 
      pb.org_name, 
      pb.job_title, 
      pb.work_email, 
      pb.category, 
      pb.logo_url, 
      pb.about_business, 
      pb.work_email_verified
    FROM profiles p
    INNER JOIN profiles_business pb ON p.id = pb.profile_id
    WHERE p.profile_type = 'business' AND pb.id = $1
  `;

  const result = await pool.query(query, [businessProfileId]);

  return result.rows.length > 0 ? result.rows[0] : null;
};
