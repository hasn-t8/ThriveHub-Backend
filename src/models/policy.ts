import pool from '../config/db';

export interface Policy {
  id: string;
  effect: string;
  actions: string[];
  resources: string[];
}

// Attach a policy to a user using their ID
export const attachPolicyToUser = async (userId: number, policy: Policy): Promise<void> => {
  await pool.query(
    'INSERT INTO policies (user_id, effect, actions, resources) VALUES ($1, $2, $3, $4)',
    [userId, policy.effect, JSON.stringify(policy.actions), JSON.stringify(policy.resources)]
  );
  console.log(`Policy "${policy.id}" attached to user with ID ${userId}.`);
};

// Attach a policy to a user type
export const attachPolicyToType = async (typeId: number, policy: Policy): Promise<void> => {
  await pool.query(
    'INSERT INTO policies (type_id, effect, actions, resources) VALUES ($1, $2, $3, $4)',
    [typeId, policy.effect, JSON.stringify(policy.actions), JSON.stringify(policy.resources)]
  );
  console.log(`Policy "${policy.id}" attached to type with ID ${typeId}.`);
};

// Get all policies for a user (type-level and user-specific)
export const getPoliciesForUser = async (userId: number): Promise<Policy[]> => {
  // Fetch type-level policies
  const typePoliciesResult = await pool.query(
    `SELECT effect, actions, resources
     FROM policies
     WHERE type_id IN (
       SELECT type_id
       FROM user_user_types
       WHERE user_id = $1
     )`,
    [userId]
  );

  // Fetch user-specific policies
  const userPoliciesResult = await pool.query(
    `SELECT effect, actions, resources
     FROM policies
     WHERE user_id = $1`,
    [userId]
  );

  // Combine both sets of policies
  return [...typePoliciesResult.rows, ...userPoliciesResult.rows];
};
