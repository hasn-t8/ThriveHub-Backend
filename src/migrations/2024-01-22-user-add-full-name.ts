import { Pool } from 'pg';

export const up = async (pool: Pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE public.users
      ADD COLUMN full_name VARCHAR(255);
    `);
    console.log('Column "full_name" added to table "users".');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding column "full_name":', (error as any).message);
    throw error;
  } finally {
    client.release();
  }
};

export const down = async (pool: Pool) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_catalog.pg_tables 
        WHERE tablename = 'users' AND schemaname = 'public'
      );
    `);

    if (tableExists.rows[0].exists) {
      await client.query(`
        ALTER TABLE public.users
        DROP COLUMN IF EXISTS full_name;
      `);
      console.log('Column "full_name" removed from table "users".');
    } else {
      console.log('Table "users" does not exist, skipping column removal.');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing column "full_name":', (error as any).message);
    throw error;
  } finally {
    client.release();
  }
};
