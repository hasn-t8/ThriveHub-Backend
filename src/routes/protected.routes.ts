import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/protected-resource",
  authenticate,
  authorize("read", "protected-resource"),
  (req, res) => {
    res.json({ message: "Access granted to protected resource" });
  }
);

export default router;
