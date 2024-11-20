import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { AuthenticatedRequest } from '../types/authenticated-request';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string; tokenVersion: number };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Unauthorized: Token expired' });
      } else {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      return;
    }

    const result = await pool.query(
      `SELECT email, token_version, is_active FROM users WHERE email = $1`,
      [decoded.email]
    );
    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    if (user.token_version !== decoded.tokenVersion) {
      res.status(401).json({ error: 'Unauthorized: Token mismatch' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Forbidden: User is inactive' });
      return;
    }

    req.user = {
      email: user.email,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
