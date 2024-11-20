import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
    role: string;
  };
}
