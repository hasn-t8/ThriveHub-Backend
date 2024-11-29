import { Router, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { findUserById } from "../../models/user";
import {
  createProfile,
  createPersonalProfile,
  createBusinessProfile,
} from "../../models/profile";

const router = Router();

// Validation middleware for creating profiles
const validateProfileCreation = [
  check("userId").isInt().withMessage("User ID must be an integer"),
  check("profileType")
    .isIn(["business", "personal"])
    .withMessage("Profile type must be either 'business' or 'personal'"),
  check("fullName").notEmpty().withMessage("Full name is required"),
  check("profileData").isObject().withMessage("Profile data must be an object"),
];

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Create a new profile for a user
 *     tags: [Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - profileType
 *               - fullName
 *               - profileData
 *             properties:
 *               userId:
 *                 type: integer
 *               profileType:
 *                 type: string
 *               fullName:
 *                 type: string
 *               profileData:
 *                 type: object
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       400:
 *         description: Validation errors
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/profiles",
  validateProfileCreation,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { userId, profileType, profileData } = req.body;

    try {
      // Check if the user exists
      const user = await findUserById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

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
