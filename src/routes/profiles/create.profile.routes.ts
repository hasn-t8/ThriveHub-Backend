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

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Create a new profile for the authenticated user
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
 *                 description: Type of profile ("business" or "personal")
 *               profileData:
 *                 type: object
 *                 description: Profile-specific data
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Internal server error
 */
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

export default router;
