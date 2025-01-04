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
import createProfile from './profiles/profile.routes';
import analyticsBusinessProfileViews from './analytics/business.views.routes';
import deleteUserRoute from "./auth/delete-auth-routes";
import adminBusinessProfile from './admin/business-profile.routes';
import uploadLogo from './profiles/upload_logo.routes';
import businessProfile from './profiles/business-profile.routes';
// import keyFeaturesAndKeyName from './profiles/key-features.routes';
import businessKeyPoints from './profiles/business-key-points.routes';
import personalProfileImage from './profiles/personal-profile-image-upload.routes';
import reviews from './profiles/reviews.routes';
import likes from './profiles/tc-likes.routes';
import blogPosts from './blog/blog-posts.routes';
import blogCategories from './blog/categories.routes';
import imageUpload from './blog/image-uploads.routes';

import subsciptions from './subscriptions.routes';



router.use(authLoginRoute);
router.use(authRegistrationRoute);
router.use(verifyJwtTokenRoute);
router.use(activateAccountRoute);
router.use(logoutRoute);
router.use(forgotPasswordRoute);
router.use(forgotPasswordChangeRoute);
router.use(changePasswordRoute);

/** ---------------------  profile routes --------------------- */
router.use(createProfile);
router.use(analyticsBusinessProfileViews);
router.use(deleteUserRoute);
router.use(personalProfileImage);

/** ---------------------  admin routes --------------------- */
router.use(adminBusinessProfile);

/** ---------------------  business profile routes --------------------- */
router.use(uploadLogo);
router.use(businessProfile);
// router.use(keyFeaturesAndKeyName);
router.use(businessKeyPoints);
router.use(reviews);

router.use(likes);

router.use(blogPosts);
router.use(blogCategories);
router.use(imageUpload);

router.use(subsciptions);




export default router;
