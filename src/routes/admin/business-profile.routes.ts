import { Router, Response } from "express";
import { verifyToken } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { getAllBusinessProfiles } from "../../models/business-profile.models";
import { AuthenticatedRequest } from "../../types/authenticated-request";

const router = Router();

// Admin route to get all business profiles
router.get(
  "/admin/businessprofiles",
  verifyToken,
  authorize("*", "*"), // Admins should have full access
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const allBusinessProfiles = await getAllBusinessProfiles();

      if (!allBusinessProfiles || allBusinessProfiles.length === 0) {
        res.status(404).json({ error: "No business profiles found" });
        return;
      }

      res.status(200).json(allBusinessProfiles);
    } catch (error) {
      console.error("Error fetching all business profiles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Admin Business Profiles
 *   description: Endpoints for managing business profiles as an admin
 *
 * /admin/businessprofiles:
 *   get:
 *     summary: Retrieve all business profiles
 *     description: This endpoint allows admin users to retrieve all business profiles. Admins must have full access permissions.
 *     tags: [Admin Business Profiles]
 *     security:
 *       - bearerAuth: [] # Using token-based authentication
 *     responses:
 *       200:
 *         description: Successfully retrieved all business profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   profile_id:
 *                     type: integer
 *                     description: The ID of the profile
 *                   business_website_url:
 *                     type: string
 *                     description: The website URL of the business
 *                   org_name:
 *                     type: string
 *                     description: The name of the organization
 *                   job_title:
 *                     type: string
 *                     description: The job title of the user in the business
 *                   work_email:
 *                     type: string
 *                     description: The work email of the business
 *                   category:
 *                     type: string
 *                     description: The category of the business
 *                   logo_url:
 *                     type: string
 *                     description: The logo URL of the business
 *                   about_business:
 *                     type: string
 *                     description: Description of the business
 *                   work_email_verified:
 *                     type: boolean
 *                     description: Whether the work email is verified
 *       401:
 *         description: Unauthorized - User token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *       403:
 *         description: Forbidden - User does not have the required permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *       404:
 *         description: No business profiles found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 */
