import { Router } from 'express';
import authRoute from './auth/auth.registration.routes';
import authRegistrationRoute from './auth/auth.registration.routes';
import usersRoute from './users.routes';

const router = Router();

// Use individual route files
router.use(usersRoute);
router.use(authRoute);
router.use(authRegistrationRoute);

export default router;
