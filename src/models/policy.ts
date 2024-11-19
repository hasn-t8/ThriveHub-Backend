import pool from '../config/db';

export interface Policy {
  id: string;
  effect: string;
  actions: string[];
  resources: string[];
}

export const attachPolicyToUser = async (username: string, policy: Policy): Promise<void> => {
  await pool.query('INSERT INTO policies (username, effect, actions, resources) VALUES ($1, $2, $3, $4)', [
    username,
    policy.effect,
    JSON.stringify(policy.actions),
    JSON.stringify(policy.resources),
  ]);
};
