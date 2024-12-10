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
export async function validateBusinessProfileOwnership(userId: number, businessProfileId: number): Promise<string | null> {
  const query = `
    SELECT pb.id
    FROM profiles_business pb
    JOIN profiles p ON pb.profile_id = p.id
    WHERE p.user_id = $1 AND pb.id = $2
    LIMIT 1;
  `;

  try {
    const result = await pool.query(query, [userId, businessProfileId]);
    console.log('result', result);

    return result.rows.length > 0 ? result.rows[0].id : null; // Return the ID if found
  } catch (error) {
    console.error("Error validating business profile ownership:", error);
    throw error;
  }
}



/** --------------------- Create Profile --------------------- */
export const createProfile = async (
  userId: number,
  profileType: string
): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO profiles (user_id, profile_type) 
     VALUES ($1, $2) 
     RETURNING id`,
    [userId, profileType]
  );
  return result.rows[0].id;
};

/** --------------------- Find Profile By ID --------------------- */
export const findProfileById = async (
  profileId: number
): Promise<Profile | null> => {
  const result = await pool.query("SELECT * FROM profiles WHERE id = $1", [
    profileId,
  ]);
  return result.rows[0] || null;
};

/** --------------------- Create Personal Profile --------------------- */
export const createPersonalProfile = async (
  profileId: number,
  data: { occupation: string }
): Promise<void> => {
  const { occupation } = data;
  await pool.query(
    `INSERT INTO profiles_personal (profile_id, occupation) 
     VALUES ($1, $2)`,
    [profileId, occupation]
  );
};

/** --------------------- Create Business Profile --------------------- */
export const createBusinessProfile = async (
  profileId: number,
  data: {
    business_website_url?: string;
    org_name: string;
    job_title?: string;
    work_email?: string;
    category?: string;
    logo_url?: string;
    about_business?: string;
    work_email_verified?: boolean;
  }
): Promise<void> => {
  const {
    business_website_url,
    org_name,
    job_title,
    work_email,
    category,
    logo_url,
    about_business,
    work_email_verified,
  } = data;

  await pool.query(
    `INSERT INTO profiles_business (
      profile_id, business_website_url, org_name, job_title, work_email,
      category, logo_url, about_business, work_email_verified
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      profileId,
      business_website_url,
      org_name,
      job_title,
      work_email,
      category,
      logo_url,
      about_business,
      work_email_verified || false,
    ]
  );
};

export const getCompleteProfileByUserId = async (userId: number) => {
  const query = `
    SELECT 
      u.full_name,
      u.email,
      p.id AS profile_id, 
      p.profile_type, 
      pp.occupation, 
      pp.date_of_birth, 
      pp.phone_number, 
      pp.address_line_1, 
      pp.address_line_2, 
      pp.address_city, 
      pp.address_zip_code, 
      pp.img_profile_url,
      pb.id AS business_profile_id,
      pb.business_website_url, 
      pb.org_name, 
      pb.job_title, 
      pb.work_email, 
      pb.category, 
      pb.logo_url, 
      pb.about_business, 
      pb.work_email_verified
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
    LEFT JOIN profiles_business pb ON p.id = pb.profile_id
    WHERE u.id = $1
  `;

  const result = await pool.query(query, [userId]);

  // If no rows are returned, return just the user's full_name
  if (result.rows.length === 0) {
    const fallbackResult = await pool.query(
      `SELECT full_name FROM users WHERE id = $1`,
      [userId]
    );

    return fallbackResult.rows[0] || null;
  }

  let profiles = result.rows;

  // Check if there is no personal profile and add a default one
  const hasPersonalProfile = profiles.some(
    (profile) => profile.profile_type === "personal"
  );
  // const hasBusinessProfile = profiles.some(profile => profile.profile_type === 'business');

  if (!hasPersonalProfile) {
    profiles.push({
      full_name: profiles[0]?.full_name || null, // Use user name if available
      email: profiles[0]?.email || null, // Use user email if available
      profile_id: null,
      profile_type: "personal",
      occupation: null,
      date_of_birth: null,
      phone_number: null,
      address_line_1: null,
      address_line_2: null,
      address_city: null,
      address_zip_code: null,
      img_profile_url: null
    });
  }

  // Remove rows with profile_type null
  profiles = profiles.filter((profile) => profile.profile_type !== null);

  return profiles;
};

export const createOrUpdatePersonalProfile = async (
  userId: number,
  data: any
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if the profile exists
    const profileResult = await client.query(
      `
      SELECT id FROM profiles 
      WHERE user_id = $1 AND profile_type = 'personal'
      `,
      [userId]
    );

    let profileId;
    let personalProfileId;

    if (profileResult.rowCount && profileResult.rowCount > 0) {
      profileId = profileResult.rows[0].id;

      // Update profiles_personal table and return the personal_profile_id
      const personalProfileResult = await client.query(
        `
        UPDATE profiles_personal 
        SET occupation = $1, date_of_birth = $2, phone_number = $3, 
            address_line_1 = $4, address_line_2 = $5, address_city = $6, 
            address_zip_code = $7, img_profile_url = $8
        WHERE profile_id = $9
        RETURNING id
        `,
        [
          data.occupation,
          data.date_of_birth,
          data.phone_number,
          data.address_line_1,
          data.address_line_2,
          data.address_city,
          data.address_zip_code,
          data.img_profile_url,
          profileId,
        ]
      );

      personalProfileId = personalProfileResult.rows[0].id;
    } else {
      // Create new profile and profiles_personal entry
      const newProfileResult = await client.query(
        `
        INSERT INTO profiles (user_id, profile_type) 
        VALUES ($1, 'personal') RETURNING id
        `,
        [userId]
      );

      profileId = newProfileResult.rows[0].id;

      const newPersonalProfileResult = await client.query(
        `
        INSERT INTO profiles_personal (profile_id, occupation, date_of_birth, phone_number, 
                                       address_line_1, address_line_2, address_city, 
                                       address_zip_code, img_profile_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        `,
        [
          profileId,
          data.occupation,
          data.date_of_birth,
          data.phone_number,
          data.address_line_1,
          data.address_line_2,
          data.address_city,
          data.address_zip_code,
          data.img_profile_url,
        ]
      );

      personalProfileId = newPersonalProfileResult.rows[0].id;
    }

    await client.query("COMMIT");
    return { profileId, personalProfileId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const createOrUpdateBusinessProfile = async (
  userId: number,
  data: any
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let profileId;
    let businessProfileId = data.business_profile_id; // Assume it's passed in `data`

    if (businessProfileId) {
      // Update existing business profile
      const businessProfileResult = await client.query(
        `
        UPDATE profiles_business 
        SET business_website_url = $1, org_name = $2, job_title = $3, 
            work_email = $4, category = $5, logo_url = $6, about_business = $7, 
            work_email_verified = $8
        WHERE id = $9
        RETURNING profile_id, id
        `,
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
        throw new Error("Invalid business_profile_id");
      }

      profileId = businessProfileResult.rows[0].profile_id;
      businessProfileId = businessProfileResult.rows[0].id;
    } else {
      // Create new profile and profiles_business entry
      const profileResult = await client.query(
        `
        SELECT id FROM profiles 
        WHERE user_id = $1 AND profile_type = 'business'
        `,
        [userId]
      );

      if (profileResult.rowCount && profileResult.rowCount > 0) {
        profileId = profileResult.rows[0].id;
      } else {
        const newProfileResult = await client.query(
          `
          INSERT INTO profiles (user_id, profile_type) 
          VALUES ($1, 'business') RETURNING id
          `,
          [userId]
        );

        profileId = newProfileResult.rows[0].id;
      }

      const newBusinessProfileResult = await client.query(
        `
        INSERT INTO profiles_business (profile_id, business_website_url, org_name, 
                                       job_title, work_email, category, logo_url, 
                                       about_business, work_email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
        `,
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

      businessProfileId = newBusinessProfileResult.rows[0].id;
    }

    await client.query("COMMIT");
    return { profileId, businessProfileId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};



/** --------------------- Delete Profile --------------------- */
export const deleteProfile = async (profileId: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete from profiles_personal if exists
    await client.query("DELETE FROM profiles_personal WHERE profile_id = $1", [profileId]);

    // Delete from profiles_business if exists
    await client.query("DELETE FROM profiles_business WHERE profile_id = $1", [profileId]);

    // Delete from profiles
    const result = await client.query("DELETE FROM profiles WHERE id = $1 RETURNING id", [profileId]);

    if (result.rowCount === 0) {
      throw new Error("Profile not found");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting profile:", error);
    throw error;
  } finally {
    client.release();
  }
};
