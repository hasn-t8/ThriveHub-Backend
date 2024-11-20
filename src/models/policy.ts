import pool from '../config/db';

export interface Policy {
  id: string;
  effect: string;
  actions: string[];
  resources: string[];
}

// Attach a policy to a user using their email
export const attachPolicyToUser = async (email: string, policy: Policy): Promise<void> => {
  await pool.query(
    'INSERT INTO policies (user_email, effect, actions, resources) VALUES ($1, $2, $3, $4)',
    [email, policy.effect, JSON.stringify(policy.actions), JSON.stringify(policy.resources)]
  );
};
