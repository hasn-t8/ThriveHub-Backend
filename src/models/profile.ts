import pool from "../config/db";

export interface Profile {
  id: number;
  user_id: number;
  profile_type: "personal";
  created_at: Date;
  updated_at: Date;
}

/** --------------------- Create Profile --------------------- */
export const createProfile = async (userId: number, profileType: string): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO profiles (user_id, profile_type) 
     VALUES ($1, $2) 
     RETURNING id`,
    [userId, profileType]
  );
  return result.rows[0].id;
};

/** --------------------- Find Profile By ID --------------------- */
export const findProfileById = async (profileId: number): Promise<Profile | null> => {
  const result = await pool.query("SELECT * FROM profiles WHERE id = $1", [profileId]);
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

/** --------------------- Get Personal Profile By User ID --------------------- */
export const getPersonalProfileByUserId = async (userId: number) => {
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
      pp.img_profile_url
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id AND p.profile_type = 'personal'
    LEFT JOIN profiles_personal pp ON p.id = pp.profile_id
    WHERE u.id = $1
  `;

  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0 || !result.rows[0].profile_id) {
    return null;
  }

  return result.rows[0];
};

/** --------------------- Create or Update Personal Profile --------------------- */
export const createOrUpdatePersonalProfile = async (userId: number, data: any) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

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