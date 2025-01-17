import { Router, Response } from "express";
import { check } from "express-validator";
import { verifyAdmin, verifyToken } from "../middleware/authenticate";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { findStripeCustomerByUserId, saveStripeCustomerId } from "../models/user.models";
import { createOrSwitchSubscription, cancelSubscription } from "../services/subscriptions.service";
import { getAllActiveSubscriptions } from "../models/subscriptions.models";
import Stripe from "stripe";
import {
  getSubscriptionsByUser,
  createSubscription,
  deleteSubscription,
} from "../models/subscriptions.models";

import { createCheckout } from "../models/checkouts.models";

import stripe from "../config/stripe";

let website_url;
if (process.env.NODE_ENV === "development") {
  website_url = "http://localhost:5173";
} else {
  website_url = "https://thrivehub.ai";
}

const router = Router();

// Validation middleware for subscription creation
const validateSubscriptionPlanType = [
  check("plan")
    .isIn(["basic_monthly", "basic_yearly", "premium_monthly", "premium_yearly"])
    .withMessage("Invalid plan type"),
];

// Get all subscriptions for the authenticated user
router.get(
  "/subscriptions/:theUserId",
  verifyToken,
  verifyAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const userType = req.user?.type;
    const theUserId = req.params.theUserId;

    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    if (userType !== "admin") {
      res.status(400).json({ error: "Not Authorized" });
      return;
    }

    if (isNaN(Number(theUserId))) {
      res.status(400).json({ error: "User ID must be a number" });
      return;
    }

    try {
      const subscriptions = await getSubscriptionsByUser(Number(theUserId));

      if (!subscriptions || subscriptions.length === 0) {
        res.status(404).json({ error: "No subscriptions found" });
        return;
      }

      res.status(200).json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get all subscriptions for the authenticated user
router.get(
  "/subscriptions",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const subscriptions = await getSubscriptionsByUser(userId);

      if (!subscriptions || subscriptions.length === 0) {
        res.status(404).json({ error: "No subscriptions found" });
        return;
      }

      res.status(200).json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get(
  "/subscriptions-active",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const subscriptions = await getAllActiveSubscriptions(userId);

      if (!subscriptions || subscriptions.length === 0) {
        res.status(404).json({ error: "No subscriptions found" });
        return;
      }

      res.status(200).json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// POST route for subscription updates
router.post(
  "/subscription",
  verifyToken,
  validateSubscriptionPlanType,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { plan } = req.body;

    if (!userId || !userEmail) {
      res.status(400).json({ error: "User ID and email are required." });
      return;
    }

    try {
      const result = await createOrSwitchSubscription(userId, userEmail, plan);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating subscription:", error.message);
      } else {
        console.error("Error updating subscription:", error);
      }
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * Route to cancel a Stripe subscription.
 */
router.post(
  "/subscriptions/cancel",
  verifyToken,
  verifyAdmin, // Admins can cancel subscriptions for any user
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { subscriptionId, cancelAtPeriodEnd = true } = req.body;

    const userId = req.user?.id;
    const userType = req.user?.type;

    if (!userId) {
      res.status(400).json({ error: "User ID not found." });
      return;
    }

    if (!subscriptionId || typeof subscriptionId !== "string") {
      res.status(400).json({ error: "Subscription ID is required and should be a string." });
      return;
    }

    try {
      // Retrieve all active or valid subscriptions for the user
      const activeSubscriptions = await getAllActiveSubscriptions(userId);

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        res.status(404).json({ error: "No active subscriptions found for this user." });
        return;
      }

      // Find the subscription matching the provided subscriptionId
      const matchingSubscription = activeSubscriptions.find(
        (sub) => sub.stripe_subscription_id === subscriptionId
      );

      if (!matchingSubscription) {
        res.status(404).json({ error: "No matching subscription found for this subscription ID." });
        return;
      }

      // Check if the user is authorized to cancel the subscription
      if (matchingSubscription.user_id !== userId && userType !== "admin") {
        res.status(403).json({ error: "You are not authorized to cancel this subscription." });
        return;
      }

      // Cancel the subscription
      const updatedSubscription = await cancelSubscription(subscriptionId, cancelAtPeriodEnd);

      res.status(200).json({
        message: `Subscription ${
          cancelAtPeriodEnd ? "scheduled for cancellation" : "canceled"
        } successfully.`,
        subscription: updatedSubscription,
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel the subscription. Please try again later." });
    }
  }
);

router.post(
  "/check-session",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    let subscription: Stripe.Subscription | undefined;
    let product: Stripe.Product | undefined;

    if (!userId || !userEmail) {
      res.status(400).json({ error: "User ID and email are required" });
      return;
    }

    // console.log("req.body.session_id", req.body);

    try {
      const session = await stripe.checkout.sessions.retrieve(req.body.session_id);
      // console.log("session", session);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      if (session.subscription && typeof session.subscription === "string") {
        subscription = await stripe.subscriptions.retrieve(session.subscription);
      }
      if (subscription?.items.data[0].plan.product) {
        // console.log("subscription", subscription);
        const productId = subscription?.items.data[0].plan.product;
        if (typeof productId === "string") {
          product = await stripe.products.retrieve(productId);
        }
      }
      if (subscription && product) {
        await createSubscription(
          userId,
          subscription.id,
          product.name,
          subscription.status,
          subscription.start_date ? new Date(subscription.start_date * 1000) : new Date(),
          subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : new Date()
        );
      }
      res.status(200).json({ session, subscription, product });
      // res.status(200).json(product);
      return;
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  }
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Endpoints for managing subscriptions
 *
 * /subscriptions:
 *   get:
 *     summary: Get all subscriptions for the authenticated user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Subscription"
 *       400:
 *         description: User ID is required
 *       404:
 *         description: No subscriptions found
 *       500:
 *         description: Internal server error
 *
 * /subscriptions/active:
 *   get:
 *     summary: Get all active subscriptions for the authenticated user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of active subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Subscription"
 *       400:
 *         description: User ID is required
 *       404:
 *         description: No active subscriptions found
 *       500:
 *         description: Internal server error
 *
 * /subscription:
 *   post:
 *     summary: Create or update a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 description: Subscription plan type
 *                 enum: [basic_monthly, basic_yearly, premium_monthly, premium_yearly]
 *             example:
 *               plan: "premium_monthly"
 *     responses:
 *       200:
 *         description: Subscription created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: Invalid input or error during subscription creation
 *       500:
 *         description: Internal server error
 *
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel a Stripe subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriptionId:
 *                 type: string
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: true
 *             example:
 *               subscriptionId: "sub_XXXXXXXX"
 *               cancelAtPeriodEnd: true
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: "#/components/schemas/Subscription"
 *       400:
 *         description: Invalid Subscription ID
 *       403:
 *         description: Unauthorized action
 *       404:
 *         description: No matching subscription found
 *       500:
 *         description: Internal server error
 *
 * /check-session:
 *   post:
 *     summary: Validate a checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_id:
 *                 type: string
 *                 description: ID of the checkout session
 *             example:
 *               session_id: "cs_test_123"
 *     responses:
 *       200:
 *         description: Session, subscription, and product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *                 subscription:
 *                   $ref: "#/components/schemas/Subscription"
 *                 product:
 *                   type: object
 *       400:
 *         description: Missing or invalid session ID
 *       404:
 *         description: Session not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         stripe_subscription_id:
 *           type: string
 *         plan:
 *           type: string
 *         status:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         next_billing_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */

/**
 * @swagger
 * /subscriptions/{theUserId}:
 *   get:
 *     summary: Get all subscriptions for a specific user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: theUserId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user whose subscriptions are to be retrieved
 *     responses:
 *       200:
 *         description: A list of subscriptions for the specified user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Subscription"
 *       400:
 *         description: Invalid or missing user ID parameter
 *       403:
 *         description: Not authorized
 *       404:
 *         description: No subscriptions found for the specified user
 *       500:
 *         description: Internal server error
 *
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         stripe_subscription_id:
 *           type: string
 *         plan:
 *           type: string
 *         status:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         next_billing_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */
