import { Router, Request, Response } from "express";
import { findUserByEmail, activateUser } from "../../models/user";
import pool from "../../config/db";
import { check, validationResult } from "express-validator";

const router = Router();

// Validation middleware for the "verify" route
const validateVerification = [
  check("email").isEmail().withMessage("Email must be valid"),
  check("code")
    .isInt({ min: 100000, max: 999999 })
    .withMessage("Code must be a 6-digit number"),
];

const validateGetCode = [
  check("email").isEmail().withMessage("Email must be valid"),
];

// Verify account route
router.post(
  "/auth/activate-account/verify",
  validateVerification,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, code } = req.body;

    try {
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const result = await pool.query(
        "SELECT code FROM user_verification WHERE user_id = $1",
        [user.id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Invalid verification code" });
        return;
      }

      if (result.rows[0].code !== parseInt(code, 10)) {
        res.status(400).json({ error: "Invalid verification code" });
        return;
      }

      await activateUser(email);

      await pool.query("DELETE FROM user_verification WHERE user_id = $1", [user.id]);

      res.status(200).json({ message: "Account verified successfully" });
    } catch (error) {
      console.error("Error during verification:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Route to get the verification code
router.post(
  "/auth/activate-account/get-code",
  validateGetCode,
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const result = await pool.query(
        "SELECT code FROM user_verification WHERE user_id = $1",
        [user.id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Invalid verification code" });
        return;
      }

      console.log('result.rows[0].code', result.rows[0].code);
      
      res.status(200).json({ verificationCode: result.rows[0].code });
    } catch (error) {
      console.error("Error fetching verification code:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


export default router;
