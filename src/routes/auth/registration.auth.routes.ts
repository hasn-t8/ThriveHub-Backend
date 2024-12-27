import { Router, Request, Response } from "express";
import { sendMail } from "../../helpers/mailgun.helper";
import { createUser, findUserByEmail, assignUserTypes, saveVerificationCode, findUserById } from "../../models/user.models";
import { createBusinessProfile } from "../../models/business-profile.models";
import { check, validationResult } from "express-validator";
import crypto from "crypto";

const router = Router();

// Validation middleware for the "register" route
const validateRegister = [
  check("email").isEmail().withMessage("Email must be valid"),
  check("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  check("types").isArray({ min: 1 }).withMessage("Types must be an array with at least one element"),
  check("types.*").isString().withMessage("Each type must be a string"),
];

router.post("/auth/register", validateRegister, async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password, types, full_name, org_name, job_title, business_website_url } = req.body;

  try {
    if (types.includes("business-owner") && !org_name && !job_title && !business_website_url) {
      res.status(400).json({ error: "Business owner profile details are required. Such as org_name, job_title, and business_website_url" });
      return;
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: "Conflict: Email already exists" });
      return;
    }

    // Create the user and get their ID
    const userId = await createUser(email, password, full_name);

    // Assign user types
    await assignUserTypes(userId, types);

    // Generate a 4-digit verification code
    const verificationCode = crypto.randomInt(1000, 9999);

    // Save the verification code
    await saveVerificationCode(userId, verificationCode);

    // console.log("New User registered with the verificationCode: " + verificationCode);

    const user = await findUserById(userId);

    if (!user) {
      res.status(500).json({ error: "User registration failed. Internal Server Error" });
      return;
    }

    let businessProfile = null;
    if (types.includes("business-owner") && (org_name || job_title || business_website_url)) {
      businessProfile = await createBusinessProfile(userId, {
        business_website_url,
        org_name,
        job_title,
        work_email: email,
      });
    }

    const userDeatils = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      tokenVersion: user.token_version,
      userTypes: user.userTypes,
      city: user.city,
      profileImage: user.profileImage,
    };

    const emailVariables = {
      full_name: full_name,
      email_verification_code: verificationCode,
    };

    // Send activation email
    await sendMail(
      email,
      "Welcome to ThriveHub",
      "welcome email",
      emailVariables
    );

    res.status(201).json({ message: `User registered successfully ${verificationCode}`, user: userDeatils, businessProfile });
    return;
  } catch (error) {
    if (error instanceof Error && error.message === "Organization name already exists") {
      res.status(404).json({ error: "Organization name already exists" });
      return;
    }
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication and user registration
 *
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - types
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address.
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: The user's password (at least 6 characters).
 *                 example: "securePassword123"
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: An array of user types.
 *                 example: ["registered-user", "business-owner"]
 *               full_name:
 *                 type: string
 *                 description: The full name of the user.
 *                 example: "John Doe"
 *               org_name:
 *                 type: string
 *                 description: The organization name (required if the user is a business owner).
 *                 example: "TechCorp"
 *               job_title:
 *                 type: string
 *                 description: The job title of the user (required if the user is a business owner).
 *                 example: "CEO"
 *               business_website_url:
 *                 type: string
 *                 format: uri
 *                 description: The website URL of the business (required if the user is a business owner).
 *                 example: "https://techcorp.com"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully 1234"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The ID of the user.
 *                     email:
 *                       type: string
 *                       description: The email of the user.
 *                     full_name:
 *                       type: string
 *                       description: The full name of the user.
 *                     tokenVersion:
 *                       type: integer
 *                       description: The token version for the user.
 *                     userTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: The user types associated with the user.
 *                     city:
 *                       type: string
 *                       description: The city of the user (if available).
 *                     profileImage:
 *                       type: string
 *                       format: uri
 *                       description: The profile image URL of the user (if available).
 *                 businessProfile:
 *                   type: object
 *                   nullable: true
 *                   description: The business profile details (if applicable).
 *       400:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         description: Error message
 *                         example: "Password must be at least 6 characters"
 *       409:
 *         description: Conflict error (email already exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Conflict: Email already exists"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */

export default router;
