import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";
import {
  createBusinessKeyPoint,
  createBusinessKeyPointName,
  deleteBusinessKeyPoint,
  deleteBusinessKeyPointName,
  findAllBusinessKeyPointNames,
  findAllBusinessKeyPointNamesByType,
  findBusinessKeyPointsByBusinessProfile,
  updateBusinessKeyPoint,
} from "../../models/businessKeyPoints.models";

const router = Router();

/** --------------------- Validation --------------------- */
const validateKeyPoint = [
  check("businessProfileId").isInt().withMessage("Business Profile ID must be an integer"),
  check("keyPointNameId").isInt().withMessage("Key Point Name ID must be an integer"),
  check("type").isString().withMessage("Type must be a string"),
  check("text").isString().withMessage("Text must be a string"),
];

const validateKeyPointName = [
  check("name").isString().withMessage("Name must be a string"),
  check("type").isString().withMessage("Type must be a string"),
];

/** --------------------- Create Business Key Point --------------------- */
router.post(
  "/business-key-points",
  verifyToken,
  validateKeyPoint,
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    //TODO: only allow the business owner and the admin
    const { businessProfileId, keyPointNameId, type, text } = req.body;
    const userId = req.user?.id;

    try {
      const keyPointId = await createBusinessKeyPoint(
        businessProfileId,
        keyPointNameId,
        type,
        text,
        userId!
      );
      res.status(201).json({ message: "Business Key Point created successfully", keyPointId });
    } catch (error) {
      console.error("Error creating business key point:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/** --------------------- Update Business Key Point --------------------- */
router.put(
  "/business-key-points/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const keyPointId = parseInt(req.params.id, 10);
    if (isNaN(keyPointId)) {
      res.status(400).json({ error: "Invalid key point ID" });
      return;
    }

    const { keyPointNameId, type, text } = req.body;
    const userId = req.user?.id;

    try {
      await updateBusinessKeyPoint(keyPointId, keyPointNameId, type, text, userId!);
      res.status(200).json({ message: "Business Key Point updated successfully" });
    } catch (error) {
      if ((error as Error).message === "Key Point not found") {
        res.status(404).json({ error: "Key Point not found" });
        return;
      }
      console.error("Error updating business key point:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/** --------------------- Create Business Key Point Name --------------------- */
router.post(
  "/business-key-point-names",
  verifyToken,
  validateKeyPointName,
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    //TODO: only allow a business owner and the admin
    const { name, type } = req.body;
    const userId = req.user?.id;

    try {
      const keyPointNameId = await createBusinessKeyPointName(name, type, userId!);
      res
        .status(201)
        .json({ message: "Business Key Point Name created successfully", keyPointNameId });
    } catch (error) {
      console.error("Error creating business key point name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/** --------------------- Get Business Key Points by Business Profile --------------------- */
router.get(
  "/business-key-points/business-profile/:businessProfileId",
  async (req: AuthenticatedRequest, res: Response) => {
    const businessProfileId = parseInt(req.params.businessProfileId, 10);

    if (isNaN(businessProfileId)) {
      res.status(400).json({ error: "Invalid Business Profile ID" });
      return;
    }

    try {
      const keyPoints = await findBusinessKeyPointsByBusinessProfile(businessProfileId);
      res.status(200).json(keyPoints);
    } catch (error) {
      console.error("Error fetching business key points:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/** --------------------- Get All Business Key Point Names with or without type --------------------- */
router.get(
  "/business-key-point-names/:type", // Dynamic parameter for filtering by type
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type } = req.params;

      let keyPointNames;

      if (type) {
        // Fetch business key point names filtered by type
        keyPointNames = await findAllBusinessKeyPointNamesByType(type);
        if (keyPointNames.length === 0) {
          res
            .status(404)
            .json({ error: "No business key point names found for the specified type" });
          return;
        }
      } else {
        // Fetch all business key point names
        keyPointNames = await findAllBusinessKeyPointNames();
        if (keyPointNames.length === 0) {
          res.status(404).json({ error: "No business key point names found" });
          return;
        }
      }

      res.status(200).json(keyPointNames);
    } catch (error) {
      console.error("Error fetching business key point names:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/** --------------------- Delete Business Key Point --------------------- */
router.delete(
  "/business-key-points/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const keyPointId = parseInt(req.params.id, 10);

    //TODO: only allow the owner and the admin
    if (isNaN(keyPointId)) {
      res.status(400).json({ error: "Invalid Key Point ID" });
      return;
    }

    try {
      await deleteBusinessKeyPoint(keyPointId);
      res.status(200).json({ message: "Business Key Point deleted successfully" });
    } catch (error) {
      console.error("Error deleting business key point:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/** --------------------- Delete Business Key Point Name --------------------- */
router.delete(
  "/business-key-point-names/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const keyPointNameId = parseInt(req.params.id, 10);

    //TODO: only allow the creater and the admin
    if (isNaN(keyPointNameId)) {
      res.status(400).json({ error: "Invalid Key Point Name ID" });
      return;
    }

    try {
      await deleteBusinessKeyPointName(keyPointNameId);
      res.status(200).json({ message: "Business Key Point Name deleted successfully" });
    } catch (error) {
      console.error("Error deleting business key point name:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Business Key Points
 *   description: Endpoints for managing business key points for features and why_us
 *
 * /business-key-points:
 *   post:
 *     summary: Create a new business key point
 *     tags: [Business Key Points]
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
 *               keyPointNameId:
 *                 type: integer
 *               type:
 *                 type: string
 *               text:
 *                 type: string
 *             example:
 *               businessProfileId: 1
 *               keyPointNameId: 2
 *               type: "feature"
 *               text: "This is a key point"
 *     responses:
 *       201:
 *         description: Business key point created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 keyPointId:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /business-key-points/{id}:
 *   put:
 *     summary: Update an existing business key point for features and why_us
 *     tags: [Business Key Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business key point
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keyPointNameId:
 *                 type: integer
 *               type:
 *                 type: string
 *               text:
 *                 type: string
 *             example:
 *               keyPointNameId: 2
 *               type: "why_us"
 *               text: "Updated key point text"
 *     responses:
 *       200:
 *         description: Business key point updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or invalid key point ID
 *       404:
 *         description: Key point not found
 *       500:
 *         description: Internal server error
 *
 */

/**
 * @swagger
 * tags:
 *   name: Business Key Point Names
 *   description: Endpoints for managing business key points and key point names
 *
 * /business-key-point-names:
 *   post:
 *     summary: Create a new business key point name
 *     tags: [Business Key Point Names]
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
 *               type:
 *                 type: string
 *             example:
 *               name: "Test Key Point Name"
 *               type: "feature"
 *     responses:
 *       201:
 *         description: Business key point name created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 keyPointNameId:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /business-key-point-names:
 *   get:
 *     summary: Get all business key point names
 *     tags: [Business Key Point Names]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of business key point names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *       500:
 *         description: Internal server error
 * /business-key-point-names/{type}:
 *   get:
 *     summary: Get all business key point names, optionally filtered by type
 *     tags: [Business Key Point Names]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: The type of key points to filter by (e.g., 'feature', 'why_us')
 *     responses:
 *       200:
 *         description: A list of business key point names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *       400:
 *         description: Validation error or invalid type parameter
 *       404:
 *         description: No business key point names found
 *       500:
 *         description: Internal server error
 *
 *
 * /business-key-point-names/{id}:
 *   delete:
 *     summary: Delete a business key point name
 *     tags: [Business Key Point Names]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business key point name
 *     responses:
 *       200:
 *         description: Business key point name deleted successfully
 *       400:
 *         description: Invalid key point name ID
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /business-key-points/{id}:
 *   delete:
 *     summary: Delete a business key point
 *     tags: [Business Key Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business key point
 *     responses:
 *       200:
 *         description: Business key point deleted successfully
 *       400:
 *         description: Invalid key point ID
 *       500:
 *         description: Internal server error
 *
 * /business-key-points/business-profile/{businessProfileId}:
 *   get:
 *     summary: Get all business key points for a specific business profile
 *     tags: [Business Key Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessProfileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the business profile
 *     responses:
 *       200:
 *         description: A list of business key points
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   businessProfileId:
 *                     type: integer
 *                   keyPointNameId:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   text:
 *                     type: string
 *       400:
 *         description: Validation error or invalid business profile ID
 *       500:
 *         description: Internal server error
 *
 */
