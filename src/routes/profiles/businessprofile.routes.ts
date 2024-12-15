import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  getBusinessProfilesByUserId,
  createOrUpdateBusinessProfile,
  deleteProfile,
} from "../../models/profile";

const router = Router();

// Validation middleware for business profile updates
const validateBusinessProfile = [
  check("profileData").isObject().withMessage("Profile data must be an object"),
];

// Get all business profiles for the authenticated user
router.get(
  "/businessprofiles",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const businessProfiles = await getBusinessProfilesByUserId(userId);

      if (!businessProfiles) {
        res.status(404).json({ error: "No business profiles found" });
        return;
      }

      res.status(200).json(businessProfiles);
    } catch (error) {
      console.error("Error fetching business profiles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Create or update a business profile
router.post(
  "/businessprofiles",
  verifyToken,
  validateBusinessProfile,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user?.id;
    const { profileData } = req.body;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const businessProfile = await createOrUpdateBusinessProfile(userId, profileData);
      res.status(200).json({ message: "Business profile updated", profile: businessProfile });
    } catch (error) {
      console.error("Error updating business profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete a business profile by ID
router.delete(
  "/businessprofiles/:profileId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const profileId = parseInt(req.params.profileId, 10);

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    try {
      await deleteProfile(profileId);
      res.status(200).json({ message: "Business profile deleted successfully" });
    } catch (error) {
      console.error("Error deleting business profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: BusinessProfiles
 *   description: Endpoints for managing business profiles
 *
 * /businessprofiles:
 *   get:
 *     summary: Get all business profiles for the authenticated user
 *     tags: [BusinessProfiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business profiles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   business_website_url:
 *                     type: string
 *                   org_name:
 *                     type: string
 *                   job_title:
 *                     type: string
 *                   work_email:
 *                     type: string
 *                   category:
 *                     type: string
 *                   logo_url:
 *                     type: string
 *                   about_business:
 *                     type: string
 *                   work_email_verified:
 *                     type: boolean
 *       400:
 *         description: User ID is required
 *       404:
 *         description: No business profiles found
 *       500:
 *         description: Internal Server Error
 *
 *   post:
 *     summary: Create or update a business profile
 *     tags: [BusinessProfiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profileData
 *             properties:
 *               profileData:
 *                 type: object
 *                 description: The business profile data to create or update.
 *                 additionalProperties: true
 *                 example:
 *                   business_website_url: "https://example.com"
 *                   org_name: "Example Org"
 *                   job_title: "CEO"
 *                   work_email: "ceo@example.com"
 *                   category: "Technology"
 *                   logo_url: "https://example.com/logo.png"
 *                   about_business: "Leading technology company."
 *                   work_email_verified: true
 *     responses:
 *       200:
 *         description: Business profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 profile:
 *                   type: object
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Internal Server Error
 *
 * /businessprofiles/{profileId}:
 *   delete:
 *     summary: Delete a business profile by ID
 *     tags: [BusinessProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile to delete
 *     responses:
 *       200:
 *         description: Business profile deleted successfully
 *       400:
 *         description: Invalid or missing profile ID
 *       500:
 *         description: Internal Server Error
 */
