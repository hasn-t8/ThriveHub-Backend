import { Router } from 'express';

// auth routes
import authLoginRoute from './auth/login.auth.routes';
import authRegistrationRoute from './auth/registration.auth.routes';
import verifyJwtTokenRoute from './auth/verify-jwt-token.auth.routes';
import activateAccountRoute from './auth/activate-account.auth.routes';

// users routes
import usersRoute from './users.routes';

const router = Router();

// user routes
router.use(usersRoute);

// auth routes
router.use(authLoginRoute);
router.use(authRegistrationRoute);
router.use(verifyJwtTokenRoute);
router.use(activateAccountRoute);

export default router;
