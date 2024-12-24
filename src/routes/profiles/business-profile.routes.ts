import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  getBusinessProfilesByUserId,
  createBusinessProfile,
  updateBusinessProfile,
  deleteBusinessProfile,
  getBusinessProfileByBusinessProfileId,
} from "../../models/business-profile.models";

const router = Router();

// Validation middleware for business profile
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

router.get(
  "/businessprofiles/:profileId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    //TODO: allow if the user owns this business profile, or if the user is an admin
    const profileId = parseInt(req.params.profileId, 10);

    try {
      const businessProfiles = await getBusinessProfileByBusinessProfileId(profileId);

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

// Create a new business profile
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
      const businessProfile = await createBusinessProfile(userId, profileData);
      res
        .status(201)
        .json({ message: "Business profile created successfully", profile: businessProfile });
    } catch (error) {
      console.error("Error creating business profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update an existing business profile
router.put(
  "/businessprofiles/:profileId",
  verifyToken,
  validateBusinessProfile,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const profileId = parseInt(req.params.profileId, 10);
    const { profileData } = req.body;

    if (isNaN(profileId)) {
      res.status(400).json({ error: "Invalid profile ID" });
      return;
    }

    try {
      const updatedProfile = await updateBusinessProfile(profileId, profileData);
      res
        .status(200)
        .json({ message: "Business profile updated successfully", profile: updatedProfile });
    } catch (error) {
      if (error instanceof Error && error.message === "Business profile not found") {
        res.status(404).json({ error: "Business profile not found" });
        return;
      }
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
      await deleteBusinessProfile(profileId);
      res.status(200).json({ message: "Business profile deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message === "Business Profile not found") {
        res.status(404).json({ error: "Business profile not found" });
        return;
      }
      console.error("Error deleting business profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Business Profiles
 *   description: Endpoints for managing business profiles
 *
 * /businessprofiles:
 *   get:
 *     summary: Get all business profiles for the authenticated user
 *     tags: [Business Profiles]
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
 *                   business_website_title:
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
 *     summary: Create a new business profile
 *     tags: [Business Profiles]
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
 *                 description: The business profile data to create.
 *                 additionalProperties: true
 *                 example:
 *                   business_website_url: "https://example.com"
 *                   business_website_title: "Example Website"
 *                   org_name: "Example Org"
 *                   job_title: "CEO"
 *                   work_email: "ceo@example.com"
 *                   category: "Technology"
 *                   logo_url: "https://example.com/logo.png"
 *                   about_business: "Leading technology company."
 *                   work_email_verified: true
 *     responses:
 *       201:
 *         description: Business profile created successfully
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
 *   get:
 *     summary: Get a specific business profile by its ID
 *     tags: [Business Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile to retrieve
 *     responses:
 *       200:
 *         description: Business profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile_id:
 *                   type: integer
 *                 business_website_url:
 *                   type: string
 *                 business_website_title:
 *                   type: string
 *                 org_name:
 *                   type: string
 *                 job_title:
 *                   type: string
 *                 work_email:
 *                   type: string
 *                 category:
 *                   type: string
 *                 logo_url:
 *                   type: string
 *                 about_business:
 *                   type: string
 *                 work_email_verified:
 *                   type: boolean
 *       400:
 *         description: User ID is required or invalid profile ID
 *       404:
 *         description: No business profile found
 *       500:
 *         description: Internal Server Error
 *
 *   put:
 *     summary: Update an existing business profile
 *     tags: [Business Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile to update
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
 *                 description: The business profile data to update.
 *                 additionalProperties: true
 *                 example:
 *                   org_name: "Updated Org Name"
 *                   category: "Updated Category"
 *                   business_website_url: "https://updatedwebsite.com"
 *                   business_website_title: "Updated Website"
 *     responses:
 *       200:
 *         description: Business profile updated successfully
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
 *         description: Invalid or missing data
 *       404:
 *         description: Business profile not found
 *       500:
 *         description: Internal Server Error
 *
 *   delete:
 *     summary: Delete a business profile by ID
 *     tags: [Business Profiles]
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
 *       404:
 *         description: Business profile not found
 *       500:
 *         description: Internal Server Error
 */
