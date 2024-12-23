import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  getPersonalProfileByUserId,
  createOrUpdatePersonalProfile,
} from "../../models/profile.models";

import { updateUserFullName } from "../../models/user.models";

const router = Router();

// Validation middleware for profile updates
const validateProfile = [
  check("profileType")
    .isIn(["personal", "business"])
    .withMessage("Profile type must be 'personal' or 'business'"),
  check("profileData").isObject().withMessage("Profile data must be an object"),
];

// Get all profiles (profile, personal, and business)
router.get(
  "/profiles",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const profiles = await getPersonalProfileByUserId(userId);

      if (!profiles || profiles.length === 0) {
        res.status(200).json([]);
        return;
      }

      res.status(200).json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Create or update profiles
router.post(
  "/profiles",
  verifyToken,
  validateProfile,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user?.id;
    const { profileData, fullName } = req.body;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const personalProfile = await createOrUpdatePersonalProfile(userId, profileData);
      if (fullName && fullName.trim() !== "") {
        await updateUserFullName(userId, fullName);
      }
      res.status(200).json({ message: "Personal profile updated", profile: personalProfile });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: Endpoints for managing user profiles
 *
 * /profiles:
 *   get:
 *     summary: Get all profiles for the authenticated user
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profiles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   profile_type:
 *                     type: string
 *                     description: The type of the profile (personal or business)
 *                   occupation:
 *                     type: string
 *                     description: The occupation of the user (personal profile)
 *                   date_of_birth:
 *                     type: string
 *                     format: date
 *                     description: The date of birth of the user (personal profile)
 *                   phone_number:
 *                     type: string
 *                     description: The phone number of the user (personal profile)
 *                   address_line_1:
 *                     type: string
 *                     description: The first line of the address (personal profile)
 *                   address_line_2:
 *                     type: string
 *                     description: The second line of the address (personal profile)
 *                   address_city:
 *                     type: string
 *                     description: The city of the address (personal profile)
 *                   address_zip_code:
 *                     type: string
 *                     description: The zip code of the address (personal profile)
 *                   img_profile_url:
 *                     type: string
 *                     description: The profile image URL (personal profile)
 *                   business_website_url:
 *                     type: string
 *                     description: The website URL of the business (business profile)
 *                   business_website_title:
 *                     type: string
 *                     description: The title of the website URL (business profile)
 *                   org_name:
 *                     type: string
 *                     description: The name of the organization (business profile)
 *                   job_title:
 *                     type: string
 *                     description: The job title of the user (business profile)
 *                   work_email:
 *                     type: string
 *                     description: The work email address of the user (business profile)
 *                   category:
 *                     type: string
 *                     description: The category of the business (business profile)
 *                   logo_url:
 *                     type: string
 *                     description: The logo URL of the business (business profile)
 *                   about_business:
 *                     type: string
 *                     description: A description of the business (business profile)
 *                   work_email_verified:
 *                     type: boolean
 *                     description: Whether the work email is verified (business profile)
 *                   full_name:
 *                     type: string
 *                     description: The full name of the user
 *       400:
 *         description: User ID is required
 *       404:
 *         description: Profiles not found
 *       500:
 *         description: Internal Server Error
 *
 *   post:
 *     summary: Create or update a profile for the authenticated user
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
 *                 enum: [personal, business]
 *                 description: The type of profile to create or update.
 *               profileData:
 *                 type: object
 *                 description: The profile data to be created or updated.
 *                 additionalProperties: true
 *                 example:
 *                   occupation: "Software Engineer"
 *                   date_of_birth: "1990-01-01"
 *                   phone_number: "1234567890"
 *                   address_line_1: "123 Main St"
 *                   address_line_2: "Apt 4B"
 *                   address_city: "Techville"
 *                   address_zip_code: "12345"
 *                   img_profile_url: "https://example.com/profile.jpg"
 *                   business_website_url: "https://businesswebsite.com"
 *                   business_website_title: "Business Website Title"
 *                   org_name: "Example Org"
 *                   job_title: "CEO"
 *                   work_email: "ceo@example.com"
 *                   category: "Technology"
 *                   logo_url: "https://example.com/logo.png"
 *                   about_business: "Leading technology company."
 *               fullName:
 *                 type: string
 *                 description: The full name of the user
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 profile:
 *                   type: object
 *                   description: The updated profile data
 *       400:
 *         description: Validation errors
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
 *                         description: Error message
 *       500:
 *         description: Internal Server Error
 */
