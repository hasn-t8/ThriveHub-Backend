import pool from "../config/db";

export interface Profile {
  id: number;
  user_id: number;
  profile_type: "personal" | "business";
  created_at: Date;
  updated_at: Date;
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
