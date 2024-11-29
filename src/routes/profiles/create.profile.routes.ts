import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import {
  createProfile,
  createPersonalProfile,
  createBusinessProfile,
} from "../../models/profile";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import { verifyToken } from "../../middleware/authenticate";

const router = Router();

// Validation middleware for creating profiles
const validateProfileCreation = [
  check("profileType")
    .isIn(["business", "personal"])
    .withMessage("Profile type must be either 'business' or 'personal'"),
  check("profileData").isObject().withMessage("Profile data must be an object"),
];

router.post(
  "/profiles",
  verifyToken,
  validateProfileCreation,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { profileType, profileData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      // Create the profile
      const profileId = await createProfile(userId, profileType);

      // Add specific data for the profile type
      if (profileType === "personal") {
        const { occupation } = profileData;
        await createPersonalProfile(profileId, { occupation });
      } else if (profileType === "business") {
        const {
          business_website_url,
          org_name,
          job_title,
          work_email,
          category,
          logo_url,
          about_business,
          work_email_verified,
        } = profileData;

        await createBusinessProfile(profileId, {
          business_website_url,
          org_name,
          job_title,
          work_email,
          category,
          logo_url,
          about_business,
          work_email_verified: work_email_verified || false,
        });
      }

      res.status(201).json({ message: "Profile created successfully" });
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: Endpoints for managing user profiles
 *
 * /profiles:
 *   post:
 *     summary: Create a profile for the authenticated user
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - profileType
 *               - profileData
 *             properties:
 *               profileType:
 *                 type: string
 *                 description: The type of profile to create (either 'business' or 'personal').
 *                 example: personal
 *               profileData:
 *                 type: object
 *                 description: The profile-specific data.
 *                 oneOf:
 *                   - type: object
 *                     properties:
 *                       occupation:
 *                         type: string
 *                         description: The occupation of the user (for personal profile).
 *                         example: Software Engineer
 *                   - type: object
 *                     properties:
 *                       business_website_url:
 *                         type: string
 *                         description: The website URL of the business.
 *                         example: "https://example.com"
 *                       org_name:
 *                         type: string
 *                         description: The name of the organization.
 *                         example: "Tech Corp"
 *                       job_title:
 *                         type: string
 *                         description: The job title within the organization.
 *                         example: "CTO"
 *                       work_email:
 *                         type: string
 *                         description: The work email address.
 *                         example: "jane@techcorp.com"
 *                       category:
 *                         type: string
 *                         description: The category of the business.
 *                         example: "Technology"
 *                       logo_url:
 *                         type: string
 *                         description: The URL to the business logo.
 *                         example: "https://example.com/logo.png"
 *                       about_business:
 *                         type: string
 *                         description: A brief description of the business.
 *                         example: "We build innovative tech solutions."
 *                       work_email_verified:
 *                         type: boolean
 *                         description: Indicates if the work email has been verified.
 *                         example: true
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile created successfully
 *       400:
 *         description: Validation errors in the request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         example: Profile type must be either 'business' or 'personal'
 *       401:
 *         description: 'Unauthorized: Missing or invalid token'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal Server Error
 */

export default router;
