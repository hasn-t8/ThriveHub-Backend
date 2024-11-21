import { Router } from 'express';
import authLoginRoute from './auth/auth.login.routes';
import authRegistrationRoute from './auth/auth.registration.routes';
import usersRoute from './users.routes';

const router = Router();

// Use individual route files
router.use(usersRoute);
router.use(authLoginRoute);
router.use(authRegistrationRoute);

export default router;
