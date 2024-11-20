import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../config/db";

const router = Router();

// Register a user with types
router.post(
  "/auth/register",
  async (req: Request, res: Response): Promise<void> => {
    const { username, password, email, types } = req.body;

    // Validate request body
    if (
      !username ||
      !password ||
      !email ||
      !Array.isArray(types) ||
      types.length === 0
    ) {
      res
        .status(400)
        .json({ error: "Bad Request: Missing required fields or invalid types" });
      return;
    }

    try {
      // Check if username or email already exists
      const userExists = await pool.query(
        "SELECT id FROM users WHERE username = $1 OR email = $2",
        [username, email]
      );
      if (userExists.rowCount && userExists.rowCount > 0) {
        res.status(409).json({ error: "Conflict: Username or email already exists" });
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the user
      const userResult = await pool.query(
        "INSERT INTO users (username, password, email, token_version, is_active) VALUES ($1, $2, $3, 0, true) RETURNING id",
        [username, hashedPassword, email]
      );

      const userId = userResult.rows[0].id;

      // Map the user to types
      for (const type of types) {
        const typeResult = await pool.query(
          "SELECT id FROM user_types WHERE type = $1",
          [type]
        );
        if (typeResult.rowCount && typeResult.rowCount > 0) {
          const typeId = typeResult.rows[0].id;
          await pool.query(
            "INSERT INTO user_user_types (user_id, type_id) VALUES ($1, $2)",
            [userId, typeId]
          );
        }
      }

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
