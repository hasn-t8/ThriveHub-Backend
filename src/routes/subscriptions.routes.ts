import { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../middleware/authenticate";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { recordPayment } from "../models/payments-history.models";
import { recordWebhookEvent } from "../models/webhooks-stripe.models";
import {
  createSubscription,
  getSubscriptionsByUser,
  updateSubscription,
  deleteSubscription,
} from "../models/subscriptions.models";

import stripe from "../config/stripe";

const router = Router();

// Validation middleware for subscription creation
const validateSubscription = [
  check("plan").isIn(["monthly", "yearly"]).withMessage("Invalid plan type"),
];

// Get all subscriptions for the authenticated user
router.get(
  "/subscriptions",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (userId === undefined) {
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

// Create a new subscription
router.post(
  "/subscriptions",
  verifyToken,
  validateSubscription,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId = req.user?.id;
    const { plan } = req.body;

    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    try {
      const stripeCustomer = await stripe.customers.create({
        email: req.user?.email,
      });

      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [
          {
            price:
              plan === "monthly"
                ? process.env.STRIPE_MONTHLY_PRICE
                : process.env.STRIPE_YEARLY_PRICE,
          },
        ],
      });

      const subscriptionId = await createSubscription(
        userId,
        stripeSubscription.id,
        plan,
        stripeSubscription.status,
        new Date(stripeSubscription.start_date * 1000),
        stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
        stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : null
      );

      res.status(201).json({
        message: "Subscription created successfully",
        subscriptionId,
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update a subscription
router.put(
  "/subscriptions/:subscriptionId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const subscriptionId = parseInt(req.params.subscriptionId, 10);

    if (isNaN(subscriptionId)) {
      res.status(400).json({ error: "Invalid Subscription ID" });
      return;
    }

    const updates = req.body;

    try {
      await updateSubscription(subscriptionId, updates);
      res.status(200).json({ message: "Subscription updated successfully" });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete a subscription
router.delete(
  "/subscriptions/:subscriptionId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const subscriptionId = parseInt(req.params.subscriptionId, 10);

    if (isNaN(subscriptionId)) {
      res.status(400).json({ error: "Invalid Subscription ID" });
      return;
    }

    try {
      await deleteSubscription(subscriptionId);
      res.status(200).json({ message: "Subscription deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Handle Stripe Webhooks
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Ensure the raw body is sent
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      res.status(400).json({ error: "Missing Stripe signature" });
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      await recordWebhookEvent(event.id, event.type, event.data.object);

      // Handle specific event types
      if (event.type === "invoice.payment_succeeded") {
        const paymentIntent = event.data.object;
        await recordPayment(
          paymentIntent.customer_id,
          paymentIntent.id,
          paymentIntent.amount_paid / 100,
          paymentIntent.currency,
          paymentIntent.status
        );
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error handling Stripe webhook:", error);
      res.status(400).json({ error: "Webhook handler error" });
    }
  }
);

export default router;
