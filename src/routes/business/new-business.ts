import { Router, Response } from "express";
import {
  createKeyFeature,
  getKeyFeatures,
  updateKeyFeature,
  deleteKeyFeature,
} from "../../models/key_features";
import {
  createKeyPoint,
  getKeyPoints,
  updateKeyPoint,
  deleteKeyPoint,
} from "../../models/key_point";
import { createWhyUs, getWhyUs, updateWhyUs, deleteWhyUs } from "../../models/why_us";
import {
  createFeatureName,
  getFeatureNames,
  updateFeatureName,
  deleteFeatureName,
} from "../../models/feature_names";
import { verifyToken } from "../../middleware/authenticate";
import { AuthenticatedRequest } from "../../types/authenticated-request";

const router = Router();

// Key Features Routes
router.post("/key-features", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { businessId, createdBy } = req.body;
  try {
    const newKeyFeature = await createKeyFeature(businessId, createdBy);
    res.status(201).json(newKeyFeature);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error creating key feature", error: error.message });
    } else {
      res.status(500).json({ message: "Error creating key feature" });
    }
  }
});

router.get("/key-features", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keyFeatures = await getKeyFeatures(); // Adjusted model method
    res.status(200).json(keyFeatures);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error fetching key features", error: error.message });
    } else {
      res.status(500).json({ message: "Error fetching key features" });
    }
  }
});

router.put("/key-features/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { businessId, updatedBy } = req.body;
  try {
    const updatedFeature = await updateKeyFeature(Number(id), updatedBy, businessId);
    if (updatedFeature) {
      res.status(200).json(updatedFeature);
    } else {
      res.status(404).json({ message: "Key feature not found" });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error updating key feature", error: error.message });
    } else {
      res.status(500).json({ message: "Error updating key feature" });
    }
  }
});

router.delete(
  "/key-features/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
      const deletedFeature = await deleteKeyFeature(Number(id));
      if (deletedFeature) {
        res.status(200).json(deletedFeature);
      } else {
        res.status(404).json({ message: "Key feature not found" });
      }
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: "Error deleting key feature", error: error.message });
      } else {
        res.status(500).json({ message: "Error deleting key feature" });
      }
    }
  }
);

// Key Points Routes
router.post("/key-points", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { name, text, createdBy, parentType, parentId } = req.body;
  try {
    const newKeyPoint = await createKeyPoint(name, text, createdBy, parentType, parentId);
    res.status(201).json(newKeyPoint);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error creating key point", error: error.message });
    } else {
      res.status(500).json({ message: "Error creating key point" });
    }
  }
});

router.get("/key-points", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const keyPoints = await getKeyPoints();
    res.status(200).json(keyPoints);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error fetching key points", error: error.message });
    } else {
      res.status(500).json({ message: "Error fetching key points" });
    }
  }
});

router.put("/key-points/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { updatedBy, name, text, parentType, parentId } = req.body;
  try {
    const updatedKeyPoint = await updateKeyPoint(
      Number(id),
      updatedBy,
      name,
      text,
      parentType,
      parentId
    );
    if (updatedKeyPoint) {
      res.status(200).json(updatedKeyPoint);
    } else {
      res.status(404).json({ message: "Key point not found" });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error updating key point", error: error.message });
    } else {
      res.status(500).json({ message: "Error updating key point" });
    }
  }
});

router.delete("/key-points/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const deletedKeyPoint = await deleteKeyPoint(Number(id));
    if (deletedKeyPoint) {
      res.status(200).json(deletedKeyPoint);
    } else {
      res.status(404).json({ message: "Key point not found" });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Error deleting key point", error: error.message });
    } else {
      res.status(500).json({ message: "Error deleting key point" });
    }
  }
});

// Why Us Routes
router.post("/why-us", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { businessId, createdBy } = req.body;
  try {
    const newWhyUs = await createWhyUs(businessId, createdBy);
    res.status(201).json(newWhyUs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error creating Why Us entry" });
    }
  }
});

router.get("/why-us", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const whyUs = await getWhyUs();
    res.status(200).json(whyUs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error fetching Why Us entries" });
    }
  }
});

router.put("/why-us/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { businessId, updatedBy } = req.body;
  try {
    const updatedWhyUs = await updateWhyUs(Number(id), updatedBy, businessId);
    res.status(200).json(updatedWhyUs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error updating Why Us entry" });
    }
  }
});

router.delete("/why-us/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const deletedWhyUs = await deleteWhyUs(Number(id));
    res.status(200).json(deletedWhyUs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error deleting Why Us entry" });
    }
  }
});

// Feature Names Routes
router.post("/feature-names", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { name, createdBy } = req.body;
  try {
    const newFeatureName = await createFeatureName(name, createdBy);
    res.status(201).json(newFeatureName);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error creating feature name" });
    }
  }
});

router.get("/feature-names", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const featureNames = await getFeatureNames();
    res.status(200).json(featureNames);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error fetching feature names" });
    }
  }
});

router.put("/feature-names/:id", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, updatedBy } = req.body;
  try {
    const updatedFeatureName = await updateFeatureName(Number(id), updatedBy, name);
    res.status(200).json(updatedFeatureName);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error updating feature name" });
    }
  }
});

router.delete(
  "/feature-names/:id",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
      const deletedFeatureName = await deleteFeatureName(Number(id));
      res.status(200).json(deletedFeatureName);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error deleting feature name" });
      }
    }
  }
);

export default router;
