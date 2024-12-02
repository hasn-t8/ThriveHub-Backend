import { Router, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  getCompleteProfileByUserId,
  createOrUpdatePersonalProfile,
  createOrUpdateBusinessProfile,
} from "../../models/profile";

const router = Router();

// Validation middleware for profile updates
const validateProfile = [
  check("profileType").isIn(["personal", "business"]).withMessage("Profile type must be 'personal' or 'business'"),
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
      const profiles = await getCompleteProfileByUserId(userId);

      if (!profiles) {
        res.status(404).json({ error: "Profiles not found" });
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
    const { profileType, profileData } = req.body;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      if (profileType === "personal") {
        const personalProfile = await createOrUpdatePersonalProfile(userId, profileData);
        res.status(200).json({ message: "Personal profile updated successfully", profile: personalProfile });
      } else if (profileType === "business") {
        const businessProfile = await createOrUpdateBusinessProfile(userId, profileData);
        res.status(200).json({ message: "Business profile updated successfully", profile: businessProfile });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
