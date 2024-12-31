import { Router, Response } from "express";
import { getAllBusinessProfiles, getTotalBusinessProfilesCount } from "../../models/business-profile.models";
import { AuthenticatedRequest } from "../../types/authenticated-request";

const router = Router();

// Admin route to get all business profiles with pagination
router.get(
  "/admin/businessprofiles",
  // verifyToken,
  // authorize("*", "*"), // Admins should have full access
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { page = 1, limit = 1000 } = _req.query;

    try {
      const pageNumber = parseInt(page as string, 10);
      const pageLimit = parseInt(limit as string, 10);

      if (isNaN(pageNumber) || isNaN(pageLimit) || pageNumber <= 0 || pageLimit <= 0) {
        res.status(400).json({ error: "Invalid pagination parameters" });
        return;
      }

      const offset = (pageNumber - 1) * pageLimit;

      const allBusinessProfiles = await getAllBusinessProfiles(pageLimit, offset);
      const totalProfiles = await getTotalBusinessProfilesCount();

      const paginationInfo = {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalProfiles / pageLimit),
        totalProfiles,
        pageLimit,
      };

      if (!allBusinessProfiles || allBusinessProfiles.length === 0) {
        res.status(404).json({ error: "No business profiles found", pagination: paginationInfo });
        return;
      }

      res.status(200).json({ data: allBusinessProfiles, pagination: paginationInfo });
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
 *     description: This endpoint allows admin users to retrieve all business profiles with pagination. Admins must have full access permissions.
 *     tags: [Admin Business Profiles]
 *     security:
 *       - bearerAuth: [] # Using token-based authentication
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: The page number for pagination (default is 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: The number of records per page (default is 10)
 *     responses:
 *       200:
 *         description: Successfully retrieved all business profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       profile_id:
 *                         type: integer
 *                         description: The ID of the profile
 *                       business_profile_id:
 *                         type: integer
 *                         description: The ID of the business profile
 *                       org_name:
 *                         type: string
 *                         description: The name of the organization
 *                       category:
 *                         type: string
 *                         description: The category of the business
 *                       work_email:
 *                         type: string
 *                         description: The work email of the business
 *                       logo_url:
 *                         type: string
 *                         description: The logo URL of the business
 *                       about_business:
 *                         type: string
 *                         description: Description of the business
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       description: The current page number
 *                     totalPages:
 *                       type: integer
 *                       description: The total number of pages
 *                     totalProfiles:
 *                       type: integer
 *                       description: The total number of profiles
 *                     pageLimit:
 *                       type: integer
 *                       description: The number of profiles per page
 *       400:
 *         description: Invalid pagination parameters
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       description: The current page number
 *                     totalPages:
 *                       type: integer
 *                       description: The total number of pages
 *                     totalProfiles:
 *                       type: integer
 *                       description: The total number of profiles
 *                     pageLimit:
 *                       type: integer
 *                       description: The number of profiles per page
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
