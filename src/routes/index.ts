import { Router } from 'express';
const router = Router();

/** ---------------------  auth routes --------------------- */
import authLoginRoute from './auth/login.auth.routes';
import authRegistrationRoute from './auth/registration.auth.routes';
import verifyJwtTokenRoute from './auth/verify-jwt-token.auth.routes';
import activateAccountRoute from './auth/activate-account.auth.routes';
import logoutRoute from './auth/logout.auth.routes';
import forgotPasswordRoute from './auth/forgot-password.auth.routes';
import forgotPasswordChangeRoute from './auth/forgot-password-change.auth.routes';
import changePasswordRoute from './auth/change-password.auth.routes';
router.use(authLoginRoute);
router.use(authRegistrationRoute);
router.use(verifyJwtTokenRoute);
router.use(activateAccountRoute);
router.use(logoutRoute);
router.use(forgotPasswordRoute);
router.use(forgotPasswordChangeRoute);
router.use(changePasswordRoute);

/** ---------------------  profile routes --------------------- */
import createProfile from './profiles/profile.routes';
import analyticsBusinessProfileViews from './analytics/business.views.routes';
import deleteUserRoute from "./auth/delete-auth-routes";
router.use(createProfile);
router.use(analyticsBusinessProfileViews);

router.use(deleteUserRoute);

/** ---------------------  admin routes --------------------- */
import adminBusinessProfile from './admin/business-profile.routes';
router.use(adminBusinessProfile);


/** ---------------------  business profile routes --------------------- */
import uploadLogo from './profiles/upload_logo.routes';
import businessProfile from './profiles/business-profile.routes';
router.use(uploadLogo);
router.use(businessProfile);


export default router;
