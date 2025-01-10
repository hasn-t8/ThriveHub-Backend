import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { JWT_SECRET } from "../config/auth";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as {
        email: string;
        tokenVersion: number;
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ error: "Unauthorized: Token expired" });
      } else {
        res.status(401).json({ error: "Unauthorized: Invalid token" });
      }
      return;
    }

    const result = await pool.query(
      `SELECT email, token_version, is_active FROM users WHERE email = $1`,
      [decoded.email]
    );
    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: "Unauthorized: User not found" });
      return;
    }

    if (user.token_version !== decoded.tokenVersion) {
      res.status(401).json({ error: "Unauthorized: Token mismatch" });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: "Forbidden: User is inactive" });
      return;
    }

    req.user = {
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const verifyAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = (req.headers as any).authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      tokenVersion: number;
    };

    const { id, email, tokenVersion } = decoded;

    const result = await pool.query(
      "SELECT token_version FROM users WHERE id = $1 AND email = $2",
      [id, email]
    );

    if (result.rowCount === 0 || result.rows[0].token_version !== tokenVersion) {
      res.status(401).json({ error: "va1 - Unauthorized: Invalid token" });
      return;
    }
    const userTypeAdmin = await pool.query(`SELECT * FROM user_types WHERE type = $1`, ["admin"]);
    const adminTypeId = userTypeAdmin.rows[0].id;
    const userTypeResult = await pool.query(
      `SELECT * FROM user_user_types WHERE user_id = $1 AND type_id = $2`,
      [id, adminTypeId]
    );

    if (userTypeResult.rowCount === 0) {
      next();
    }

    if (req.user) {
      req.user.type = userTypeAdmin.rows[0].type;
    }
    // req.user = { id, email, tokenVersion, type: userTypeResult.rows[0].type };
    next();
  } catch (error) {
    console.log("verifyToken: ", error);

    res.status(401).json({ error: "va2 - Unauthorized: Invalid token" });
  }
};

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = (req.headers as any).authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      tokenVersion: number;
    };

    const { id, email, tokenVersion } = decoded;

    // console.log('token', token, email, tokenVersion);
    const result = await pool.query(
      "SELECT token_version FROM users WHERE id = $1 AND email = $2",
      [id, email]
    );

    if (result.rowCount === 0 || result.rows[0].token_version !== tokenVersion) {
      res.status(401).json({ error: "Unauthorized: Invalid tokens" });
      return;
    }

    req.user = { id, email, tokenVersion };
    next();
  } catch (error) {
    console.log("verifyToken: ", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
