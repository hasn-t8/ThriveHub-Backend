import { Response, NextFunction } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest } from '../types/authenticated-request';

export const authorize = (requiredAction: string, requiredResource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const email = req.user?.email;

      if (!email) {
        res.status(401).json({ error: 'Unauthorized: No user information found' });
        return;
      }

      // Fetch user types
      const userTypesResult = await pool.query(
        `SELECT ut.id
         FROM users u
         JOIN user_user_types uut ON u.id = uut.user_id
         JOIN user_types ut ON uut.type_id = ut.id
         WHERE u.email = $1`,
        [email]
      );
      const typeIds = userTypesResult.rows.map((type) => type.id);

      if (!typeIds.length) {
        res.status(403).json({ error: 'Forbidden: No user types found' });
        return;
      }

      // Fetch policies for the user types
      const policiesResult = await pool.query(
        `SELECT effect, actions, resources
         FROM policies
         WHERE type_id = ANY($1::INT[])`,
        [typeIds]
      );

      const policies = policiesResult.rows;

      // Check if any policy allows the action and resource
      const isAuthorized = policies.some((policy) => {
        const actions = policy.actions;
        const resources = policy.resources;

        const actionAllowed = actions.includes('*') || actions.includes(requiredAction);
        const resourceAllowed = resources.includes('*') || resources.includes(requiredResource);

        return actionAllowed && resourceAllowed && policy.effect === 'Allow';
      });

      if (!isAuthorized) {
        res.status(403).json({ error: 'Forbidden: You do not have the required permissions' });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  };
};
