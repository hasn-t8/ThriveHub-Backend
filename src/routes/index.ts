import { Router } from 'express';
import usersRoute from './users.routes';

const router = Router();

// Use individual route files
router.use(usersRoute);

export default router;
