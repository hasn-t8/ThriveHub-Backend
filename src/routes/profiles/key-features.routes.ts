import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  createFeatureName,
  findFeatureNames,
  findFeatureNameById,
  updateFeatureName,
  deleteFeatureName,
} from "../../models/feature-names";
import {
  createKeyFeature,
  findKeyFeaturesByBusinessProfile,
  deleteKeyFeature,
} from "../../models/key-features";

const router = Router();

// Validation middleware for feature names
const validateFeatureName = [check("name").isString().withMessage("Feature name must be a string")];

// Validation middleware for key features
const validateKeyFeature = [
  check("businessProfileId").isInt().withMessage("Business Profile ID must be an integer"),
  check("featureNameId").isInt().withMessage("Feature Name ID must be an integer"),
  check("text").isString().withMessage("Feature text must be a string"),
];

// Create a new feature name
router.post(
  "/feature-names",
  verifyToken,
  validateFeatureName,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, userId } = req.body;

    try {
      const featureNameId = await createFeatureName(name, userId);
      res.status(201).json({ message: "Feature name created successfully", featureNameId });
    } catch (error) {
      console.error("Error creating feature name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get all feature names
router.get(
  "/feature-names",
  verifyToken,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const featureNames = await findFeatureNames();
      if (!featureNames || featureNames.length === 0) {
        res.status(404).json({ error: "No feature names found" });
        return;
      }
      res.status(200).json(featureNames);
    } catch (error) {
      console.error("Error fetching feature names:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get a specific feature name by ID
router.get(
  "/feature-names/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const featureNameId = parseInt(req.params.id, 10);

    if (isNaN(featureNameId)) {
      res.status(400).json({ error: "Invalid feature name ID" });
      return;
    }

    try {
      const featureName = await findFeatureNameById(featureNameId);
      if (!featureName) {
        res.status(404).json({ error: "Feature name not found" });
        return;
      }
      res.status(200).json(featureName);
    } catch (error) {
      console.error("Error fetching feature name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update a feature name by ID
router.put(
  "/feature-names/:id",
  verifyToken,
  validateFeatureName,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const featureNameId = parseInt(req.params.id, 10);
    const { name, userId } = req.body;

    if (isNaN(featureNameId)) {
      res.status(400).json({ error: "Invalid feature name ID" });
      return;
    }

    try {
      await updateFeatureName(featureNameId, name, userId);
      res.status(200).json({ message: "Feature name updated successfully" });
    } catch (error) {
      console.error("Error updating feature name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete a feature name by ID
router.delete(
  "/feature-names/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const featureNameId = parseInt(req.params.id, 10);

    if (isNaN(featureNameId)) {
      res.status(400).json({ error: "Invalid feature name ID" });
      return;
    }

    try {
      await deleteFeatureName(featureNameId);
      res.status(200).json({ message: "Feature name deleted successfully" });
    } catch (error) {
      console.error("Error deleting feature name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Create a key feature for a feature name
router.post(
  "/keyfeatures",
  verifyToken,
  validateKeyFeature,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { businessProfileId, featureNameId, text, userId } = req.body;

    try {
      const keyFeatureId = await createKeyFeature(businessProfileId, featureNameId, text, userId);
      res.status(201).json({ message: "Key feature added successfully", keyFeatureId });
    } catch (error) {
      console.error("Error creating key feature:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get all key features for a business profile
router.get(
  "/keyfeatures/business-profile/:businessProfileId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessProfileId = parseInt(req.params.businessProfileId, 10);

    if (isNaN(businessProfileId)) {
      res.status(400).json({ error: "Invalid business profile ID" });
      return;
    }

    try {
      const keyFeatures = await findKeyFeaturesByBusinessProfile(businessProfileId);
      if (!keyFeatures || keyFeatures.length === 0) {
        res.status(404).json({ error: "No key features found for the given business profile" });
        return;
      }
      res.status(200).json(keyFeatures);
    } catch (error) {
      console.error("Error fetching key features:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete a key feature by ID
router.delete(
  "/keyfeatures/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const featureId = parseInt(req.params.id, 10);

    if (isNaN(featureId)) {
      res.status(400).json({ error: "Invalid feature ID" });
      return;
    }

    try {
      await deleteKeyFeature(featureId);
      res.status(200).json({ message: "Key feature deleted successfully" });
    } catch (error) {
      console.error("Error deleting key feature:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   - name: Feature Names
 *     description: Manage feature names
 *   - name: Key Features
 *     description: Manage key features
 *
 * /feature-names:
 *   post:
 *     summary: Create a new feature name
 *     tags:
 *       - Feature Names
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the feature.
 *               userId:
 *                 type: integer
 *                 description: The ID of the user creating the feature name.
 *     responses:
 *       201:
 *         description: Feature name created successfully.
 *       400:
 *         description: Validation error.
 *       500:
 *         description: Internal server error.
 *   get:
 *     summary: Get all feature names
 *     tags:
 *       - Feature Names
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all feature names.
 *       404:
 *         description: No feature names found.
 *       500:
 *         description: Internal server error.
 *
 * /feature-names/{id}:
 *   get:
 *     summary: Get a specific feature name by ID
 *     tags:
 *       - Feature Names
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the feature name.
 *     responses:
 *       200:
 *         description: Feature name details.
 *       400:
 *         description: Invalid feature name ID.
 *       404:
 *         description: Feature name not found.
 *       500:
 *         description: Internal server error.
 *   put:
 *     summary: Update a specific feature name by ID
 *     tags:
 *       - Feature Names
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the feature name to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The updated name of the feature.
 *               userId:
 *                 type: integer
 *                 description: The ID of the user updating the feature name.
 *     responses:
 *       200:
 *         description: Feature name updated successfully.
 *       400:
 *         description: Validation error or invalid ID.
 *       404:
 *         description: Feature name not found.
 *       500:
 *         description: Internal server error.
 *   delete:
 *     summary: Delete a specific feature name by ID
 *     tags:
 *       - Feature Names
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the feature name to delete.
 *     responses:
 *       200:
 *         description: Feature name deleted successfully.
 *       400:
 *         description: Invalid feature name ID.
 *       404:
 *         description: Feature name not found.
 *       500:
 *         description: Internal server error.
 *
 * /keyfeatures:
 *   post:
 *     summary: Create a key feature for a feature name
 *     tags:
 *       - Key Features
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessProfileId:
 *                 type: integer
 *                 description: The ID of the business profile.
 *               featureNameId:
 *                 type: integer
 *                 description: The ID of the feature name.
 *               text:
 *                 type: string
 *                 description: The text of the key feature.
 *               userId:
 *                 type: integer
 *                 description: The ID of the user creating the key feature.
 *     responses:
 *       201:
 *         description: Key feature created successfully.
 *       400:
 *         description: Validation error.
 *       500:
 *         description: Internal server error.
 *
 * /keyfeatures/business-profile/{businessProfileId}:
 *   get:
 *     summary: Get all key features for a specific business profile
 *     tags:
 *       - Key Features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: businessProfileId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile.
 *     responses:
 *       200:
 *         description: A list of key features.
 *       400:
 *         description: Invalid business profile ID.
 *       404:
 *         description: No key features found.
 *       500:
 *         description: Internal server error.
 *
 * /keyfeatures/{id}:
 *   delete:
 *     summary: Delete a specific key feature by ID
 *     tags:
 *       - Key Features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the key feature to delete.
 *     responses:
 *       200:
 *         description: Key feature deleted successfully.
 *       400:
 *         description: Invalid feature ID.
 *       404:
 *         description: Key feature not found.
 *       500:
 *         description: Internal server error.
 */
