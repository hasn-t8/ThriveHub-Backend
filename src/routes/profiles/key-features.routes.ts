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
  deleteKeyFeature,
} from "../../models/key-features";

const router = Router();

// Validation middleware for feature names
const validateFeatureName = [check("name").isString().withMessage("Feature name must be a string")];

// Validation middleware for key features
const validateKeyFeature = [
  check("keyNameId").isInt().withMessage("Key name ID must be an integer"),
  check("feature").isString().withMessage("Feature must be a string"),
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
      const keyNameId = await createFeatureName(name, userId);
      res.status(201).json({ message: "Key name created successfully", keyNameId });
    } catch (error) {
      console.error("Error creating key name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get all key names
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
      console.error("Error fetching key names:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get a specific key name by ID
router.get(
  "/feature-names/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const keyNameId = parseInt(req.params.id, 10);

    if (isNaN(keyNameId)) {
      res.status(400).json({ error: "Invalid key name ID" });
      return;
    }

    try {
      const keyName = await findFeatureNameById(keyNameId);
      if (!keyName) {
        res.status(404).json({ error: "Key name not found" });
        return;
      }
      res.status(200).json(keyName);
    } catch (error) {
      console.error("Error fetching key name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update a key name by ID
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

    const keyNameId = parseInt(req.params.id, 10);
    const { name, userId } = req.body;

    if (isNaN(keyNameId)) {
      res.status(400).json({ error: "Invalid key name ID" });
      return;
    }

    try {
      await updateFeatureName(keyNameId, name, userId);
      res.status(200).json({ message: "Key name updated successfully" });
    } catch (error) {
      console.error("Error updating key name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete a key name by ID
router.delete(
  "/feature-names/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const keyNameId = parseInt(req.params.id, 10);

    if (isNaN(keyNameId)) {
      res.status(400).json({ error: "Invalid key name ID" });
      return;
    }

    try {
      await deleteFeatureName(keyNameId);
      res.status(200).json({ message: "Key name deleted successfully" });
    } catch (error) {
      console.error("Error deleting key name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Create a key feature for a key name
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

    const { keyNameId, feature } = req.body;

    try {
      const keyFeatureId = await createKeyFeature(keyNameId, feature);
      res.status(201).json({ message: "Key feature added successfully", keyFeatureId });
    } catch (error) {
      console.error("Error creating key feature:", error);
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
