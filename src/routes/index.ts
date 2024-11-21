import { Router } from 'express';

// auth routes
import authLoginRoute from './auth/login.auth.routes';
import authRegistrationRoute from './auth/registration.auth.routes';
import verifyJwtTokenRoute from './auth/verify-jwt-token.auth.routes';

// users routes
import usersRoute from './users.routes';

const router = Router();

// Use individual route files
router.use(usersRoute);
router.use(authLoginRoute);
router.use(authRegistrationRoute);
router.use(verifyJwtTokenRoute);

export default router;
