import { Pool } from "pg";

export const up = async (pool: Pool) => {
  await pool.query(`
    -- Create profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_type VARCHAR(50) NOT NULL, -- 'business' or 'personal'
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, profile_type) -- Ensure one profile type per user
    );

    -- Create profiles_personal table
    CREATE TABLE IF NOT EXISTS profiles_personal (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      occupation VARCHAR(255) NOT NULL
    );

    -- Create profiles_business table
    CREATE TABLE IF NOT EXISTS profiles_business (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      business_website_url VARCHAR(255),
      org_name VARCHAR(255) NOT NULL,
      job_title VARCHAR(255),
      work_email VARCHAR(255),
      category VARCHAR(255),
      logo_url VARCHAR(255),
      about_business TEXT,
      work_email_verified BOOLEAN DEFAULT false
    );
  `);

  console.log("Profiles tables created successfully.");
};

export const down = async (pool: Pool) => {
  await pool.query(`
    DROP TABLE IF EXISTS profiles_business;
    DROP TABLE IF EXISTS profiles_personal;
    DROP TABLE IF EXISTS profiles;
  `);

  console.log("Profiles tables dropped successfully.");
};
