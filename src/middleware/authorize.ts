import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { getPoliciesForUser } from "../models/policy";

export const authorize = (requiredAction: string, requiredResource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized: No user information found" });
        return;
      }

      const policies = await getPoliciesForUser(userId);

      console.log("User policies:", policies); // Debugging

      const isAuthorized = policies.some((policy) => {
        const actionAllowed =
          policy.actions.includes("*") || policy.actions.includes(requiredAction);
        const resourceAllowed =
          policy.resources.includes("*") || policy.resources.includes(requiredResource);
        return actionAllowed && resourceAllowed && policy.effect === "Allow";
      });

      if (!isAuthorized) {
        console.log("User is not authorized to perform this action");
        res.status(403).json({ error: "Forbidden: You do not have the required permissions" });
        return;
      }

      next();
    } catch (error) {
      console.log("Authorization error:", error);
      console.error("Authorization error:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  };
};
