import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/auth";

const router = Router();

// Middleware to verify a JWT token
router.post("/auth/verify-token", (req: Request, res: Response): void => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: "Bad Request: Token is required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let email 

    if (typeof decoded === 'object' && 'email' in decoded) {
      email = decoded.email;
    }

    res.status(200).json({ status: true, message: "token is valid", email });
    return;
  } catch (error) {
    // console.error("Token verification failed:", error);
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
});

export default router;
