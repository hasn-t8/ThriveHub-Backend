import pool from '../config/db';

export const addUserType = async (type: string): Promise<void> => {
  const result = await pool.query('SELECT id FROM user_types WHERE type = $1', [type]);

  if (result.rowCount === 0) {
    await pool.query('INSERT INTO user_types (type) VALUES ($1)', [type]);
    console.log(`User type "${type}" added.`);
  }
};

export const assignUserType = async (userId: number, type: string): Promise<void> => {
  const typeResult = await pool.query('SELECT id FROM user_types WHERE type = $1', [type]);

  if (typeResult.rowCount === 0) {
    throw new Error(`User type "${type}" does not exist.`);
  }

  const typeId = typeResult.rows[0].id;

  await pool.query('INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2)', [userId, typeId]);
  console.log(`User assigned to type "${type}".`);
};
