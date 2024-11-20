import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { getPoliciesForUser } from '../models/policy';

export const authorize = (requiredAction: string, requiredResource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: No user information found' });
        return;
      }

      // Fetch all policies for the user (type-level and user-specific)
      const policies = await getPoliciesForUser(userId);

      // Evaluate policies to check if the action and resource are authorized
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
