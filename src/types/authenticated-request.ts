import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id?: number;
    tokenVersion?: number;
    email?: string;
  };
}
