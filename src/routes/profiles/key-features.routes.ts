// import { Router, Response } from "express";
// import { check, validationResult } from "express-validator";
// import { verifyToken } from "../../middleware/authenticate";
// import { AuthenticatedRequest } from "../../types/authenticated-request";
// import {
//   createFeatureName,
//   findFeatureNames,
//   findFeatureNameById,
//   updateFeatureName,
//   deleteFeatureName,
// } from "../../models/feature-names.models";
// import {
//   createKeyFeature,
//   findKeyFeaturesByBusinessProfile,
//   deleteKeyFeature,
// } from "../../models/key-features.models";

// const router = Router();

// // Validation middleware for feature names
// const validateFeatureName = [
//   check("name")
//     .isString()
//     .withMessage("Feature name must be a string")
//     .isLength({ max: 255 })
//     .withMessage("Feature name cannot exceed 255 characters"),
// ];

// // Validation middleware for key features
// const validateKeyFeature = [
//   check("businessProfileId").isInt().withMessage("Business Profile ID must be an integer"),
//   check("featureNameId").isInt().withMessage("Feature Name ID must be an integer"),
//   check("text")
//     .isString()
//     .withMessage("Feature text must be a string")
//     .isLength({ max: 1000 })
//     .withMessage("Feature text cannot exceed 1000 characters"),
// ];

// // Create a new feature name
// router.post(
//   "/feature-names",
//   verifyToken,
//   validateFeatureName,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({ errors: errors.array() });
//       return;
//     }
//     const userId = req.user?.id;

//     if (userId === undefined) {
//       res.status(400).json({ error: "User ID is required" });
//       return;
//     }

//     const { name } = req.body;

//     try {
//       const featureNameId = await createFeatureName(name, userId);
//       res.status(201).json({ message: "Feature name created successfully", featureNameId });
//     } catch (error) {
//       console.error("Error creating feature name:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Get all feature names
// router.get(
//   "/feature-names",
//   verifyToken,
//   async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
//     try {
//       const featureNames = await findFeatureNames();
//       if (!featureNames || featureNames.length === 0) {
//         res.status(404).json({ error: "No feature names found" });
//         return;
//       }
//       res.status(200).json(featureNames);
//     } catch (error) {
//       console.error("Error fetching feature names:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Get a specific feature name by ID
// router.get(
//   "/feature-names/:id",
//   verifyToken,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const featureNameId = parseInt(req.params.id, 10);

//     if (isNaN(featureNameId)) {
//       res.status(400).json({ error: "Invalid feature name ID" });
//       return;
//     }

//     try {
//       const featureName = await findFeatureNameById(featureNameId);
//       if (!featureName) {
//         res.status(404).json({ error: "Feature name not found" });
//         return;
//       }
//       res.status(200).json(featureName);
//     } catch (error) {
//       console.error("Error fetching feature name:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Update a feature name by ID
// router.put(
//   "/feature-names/:id",
//   verifyToken,
//   validateFeatureName,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({ errors: errors.array() });
//       return;
//     }

//     const userId = req.user?.id;

//     if (userId === undefined) {
//       res.status(400).json({ error: "User ID is required" });
//       return;
//     }

//     const featureNameId = parseInt(req.params.id, 10);
//     const { name } = req.body;

//     if (isNaN(featureNameId)) {
//       res.status(400).json({ error: "Invalid feature name ID" });
//       return;
//     }

//     try {
//       await updateFeatureName(featureNameId, name, userId);
//       res.status(200).json({ message: "Feature name updated successfully" });
//     } catch (error) {
//       console.error("Error updating feature name:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Delete a feature name by ID
// router.delete(
//   "/feature-names/:id",
//   verifyToken,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const featureNameId = parseInt(req.params.id, 10);

//     if (isNaN(featureNameId)) {
//       res.status(400).json({ error: "Invalid feature name ID" });
//       return;
//     }

//     try {
//       await deleteFeatureName(featureNameId);
//       res.status(200).json({ message: "Feature name deleted successfully" });
//     } catch (error) {
//       console.error("Error deleting feature name:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Create a key feature for a feature name
// router.post(
//   "/keyfeatures",
//   verifyToken,
//   validateKeyFeature,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({ errors: errors.array() });
//       return;
//     }

//     const userId = req.user?.id;

//     if (userId === undefined) {
//       res.status(400).json({ error: "User ID is required" });
//       return;
//     }

//     const { businessProfileId, featureNameId, text } = req.body;

//     try {
//       const keyFeatureId = await createKeyFeature(
//         businessProfileId,
//         featureNameId,
//         text,
//         userId
//       );
//       res.status(201).json({ message: "Key feature added successfully", keyFeatureId });
//     } catch (error) {
//       console.error("Error creating key feature:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Get all key features for a business profile
// router.get(
//   "/keyfeatures/business-profile/:businessProfileId",
//   verifyToken,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const businessProfileId = parseInt(req.params.businessProfileId, 10);

//     if (isNaN(businessProfileId)) {
//       res.status(400).json({ error: "Invalid business profile ID" });
//       return;
//     }

//     try {
//       const keyFeatures = await findKeyFeaturesByBusinessProfile(businessProfileId);
//       if (!keyFeatures || keyFeatures.length === 0) {
//         res.status(404).json({ error: "No key features found for the given business profile" });
//         return;
//       }
//       res.status(200).json(keyFeatures);
//     } catch (error) {
//       console.error("Error fetching key features:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Delete a key feature by ID
// router.delete(
//   "/keyfeatures/:id",
//   verifyToken,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const featureId = parseInt(req.params.id, 10);

//     if (isNaN(featureId)) {
//       res.status(400).json({ error: "Invalid feature ID" });
//       return;
//     }

//     try {
//       await deleteKeyFeature(featureId);
//       res.status(200).json({ message: "Key feature deleted successfully" });
//     } catch (error) {
//       console.error("Error deleting key feature:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// export default router;
