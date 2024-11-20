import { Router } from 'express';
import authRoute from './auth.routes';
import usersRoute from './users.routes';

const router = Router();

// Use individual route files
router.use(usersRoute);
router.use(authRoute);

export default router;
