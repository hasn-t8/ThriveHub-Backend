import { Router, Response } from "express";
import { verifyToken } from "../middleware/authenticate";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { check, validationResult } from "express-validator";
import { ContactUsModel } from "../models/contactUsModel";

const router = Router();

// Validation middleware for contact us messages
const validateContactUs = [
  check("name").isString().withMessage("Name must be a string"),
  check("email").isEmail().withMessage("Email must be valid"),
  check("message").isString().withMessage("Message must be a string"),
];

/**
 * Get all contact us entries
 */
router.get(
  "/contact-us",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const messages = await ContactUsModel.getAllContactUs();

      if (!messages || messages.length === 0) {
        res.status(404).json({ error: "No contact messages found" });
        return;
      }

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching contact us messages:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Add a new contact us message
 */
router.post(
  "/contact-us",
  verifyToken,
  validateContactUs,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, message, user_id, business_id } = req.body;

    if (!user_id && !business_id) {
      res.status(400).json({ error: "Either user_id or business_id must be provided" });
      return;
    }

    try {
      const newMessage = await ContactUsModel.createContactUs(
        name,
        email,
        message,
        user_id,
        business_id
      );

      res.status(201).json({ message: "Contact us message created", contactUs: newMessage });
    } catch (error) {
      console.error("Error creating contact us message:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Get contact us entries by user_id
 */
router.get(
  "/contact-us/user/:userId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid User ID" });
      return;
    }

    try {
      const messages = await ContactUsModel.getContactUsByUserId(userId);

      if (!messages || messages.length === 0) {
        res.status(404).json({ error: "No contact messages found for this user" });
        return;
      }

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching contact us messages for user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * Get contact us entries by business_id
 */
router.get(
  "/contact-us/business/:businessId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const businessId = parseInt(req.params.businessId, 10);

    if (isNaN(businessId)) {
      res.status(400).json({ error: "Invalid Business ID" });
      return;
    }

    try {
      const messages = await ContactUsModel.getContactUsByBusinessId(businessId);

      if (!messages || messages.length === 0) {
        res.status(404).json({ error: "No contact messages found for this business" });
        return;
      }

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching contact us messages for business:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;


/**
 * @swagger
 * tags:
 *   name: ContactUs
 *   description: Endpoints for managing Contact Us messages
 *
 * /contact-us:
 *   get:
 *     summary: Get all contact us entries
 *     tags: [ContactUs]
 *     responses:
 *       200:
 *         description: A list of contact us messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   message:
 *                     type: string
 *                   user_id:
 *                     type: integer
 *                     nullable: true
 *                   business_id:
 *                     type: integer
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No contact messages found
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Add a new contact us message
 *     tags: [ContactUs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *               message:
 *                 type: string
 *                 example: "I need assistance with your product."
 *               user_id:
 *                 type: integer
 *                 example: 123
 *               business_id:
 *                 type: integer
 *                 example: 456
 *     responses:
 *       201:
 *         description: Contact us message created
 *       400:
 *         description: Validation errors or missing required fields
 *       500:
 *         description: Internal server error
 *
 * /contact-us/user/{userId}:
 *   get:
 *     summary: Get contact us entries by user ID
 *     tags: [ContactUs]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       200:
 *         description: A list of contact us messages for the specified user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   message:
 *                     type: string
 *                   user_id:
 *                     type: integer
 *                   business_id:
 *                     type: integer
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid User ID
 *       404:
 *         description: No contact messages found for this user
 *       500:
 *         description: Internal server error
 *
 * /contact-us/business/{businessId}:
 *   get:
 *     summary: Get contact us entries by business ID
 *     tags: [ContactUs]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 456
 *     responses:
 *       200:
 *         description: A list of contact us messages for the specified business
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   message:
 *                     type: string
 *                   user_id:
 *                     type: integer
 *                     nullable: true
 *                   business_id:
 *                     type: integer
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid Business ID
 *       404:
 *         description: No contact messages found for this business
 *       500:
 *         description: Internal server error
 */

