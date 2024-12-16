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
  validateKeyPoint,
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
  verifyToken,
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

/** --------------------- Get All Business Key Point Names --------------------- */
router.get(
  "/business-key-point-names",
  verifyToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const keyPointNames = await findAllBusinessKeyPointNames();
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
