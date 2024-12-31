import express, { Router, Response } from "express";
import { check, validationResult } from "express-validator";
import { verifyToken } from "../middleware/authenticate";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { recordPayment } from "../models/payments-history.models";
import {
  recordWebhookEvent,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from "../models/webhooks-stripe.models";
import {
  findUserByStripeCustomerId,
  findStripeCustomerByUserId,
  saveStripeCustomerId,
} from "../models/user.models";
import Stripe from "stripe";
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

    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    const userEmail = req.user?.email;
    if (!userEmail) {
      throw new Error("User email is not available.");
    }

    try {
      // Check if Stripe customer already exists for the user
      const existingCustomer = await findStripeCustomerByUserId(userId);
      const stripeCustomer: Stripe.Customer =
        existingCustomer && typeof existingCustomer !== "string"
          ? existingCustomer
          : await stripe.customers.create({ email: userEmail });

      if (!stripeCustomer) {
        throw new Error("Failed to create or retrieve the Stripe customer.");
      }

      // If a new customer was created, save it in the database
      if (!existingCustomer) {
        await saveStripeCustomerId(userId, stripeCustomer.id);
      }

      if (!process.env.STRIPE_MONTHLY_PRICE || !process.env.STRIPE_YEARLY_PRICE) {
        throw new Error("Stripe price IDs are not configured properly.");
      }

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
        expand: ["latest_invoice.payment_intent"],
      });

      const subscriptionId = await createSubscription(
        userId,
        stripeSubscription.id,
        plan,
        stripeSubscription.status,
        new Date(stripeSubscription.start_date * 1000),
        stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : undefined,
        stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : undefined
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
        process.env.STRIPE_WEBHOOK_SECRET as string
      );

      await recordWebhookEvent(event.id, event.type, event.data.object);

      switch (event.type) {
        case "invoice.payment_succeeded":
          const invoice = event.data.object as Stripe.Invoice;

          if (typeof invoice.customer === "string") {
            const user = await findUserByStripeCustomerId(invoice.customer);

            if (!user) {
              console.error(`No user found for Stripe Customer ID: ${invoice.customer}`);
              break;
            }

            await recordPayment(
              user.id,
              invoice.id,
              invoice.amount_paid / 100,
              invoice.currency,
              invoice.status ?? "unknown"
            );
          } else {
            console.error("Unexpected customer type:", invoice.customer);
          }
          break;

        case "customer.subscription.created":
          const subscriptionCreated = event.data.object as Stripe.Subscription;

          if (typeof subscriptionCreated.customer === "string") {
            const user = await findUserByStripeCustomerId(subscriptionCreated.customer);

            if (!user) {
              console.error(
                `No user found for Stripe Customer ID: ${subscriptionCreated.customer}`
              );
              break;
            }
            await handleSubscriptionCreated(user.id, subscriptionCreated);
          } else {
            console.error("Unexpected customer type:", subscriptionCreated.customer);
          }
          break;

        case "customer.subscription.updated":
          const subscriptionUpdated = event.data.object as Stripe.Subscription;

          if (typeof subscriptionUpdated.customer === "string") {
            const user = await findUserByStripeCustomerId(subscriptionUpdated.customer);

            if (!user) {
              console.error(
                `No user found for Stripe Customer ID: ${subscriptionUpdated.customer}`
              );
              break;
            }
            await handleSubscriptionUpdated(user.id, subscriptionUpdated);
          } else {
            console.error("Unexpected customer type:", subscriptionUpdated.customer);
          }
          break;

        case "customer.subscription.deleted":
          const subscriptionDeleted = event.data.object as Stripe.Subscription;

          if (typeof subscriptionDeleted.customer === "string") {
            const user = await findUserByStripeCustomerId(subscriptionDeleted.customer);

            if (!user) {
              console.error(
                `No user found for Stripe Customer ID: ${subscriptionDeleted.customer}`
              );
              break;
            }
            await handleSubscriptionDeleted(user.id, subscriptionDeleted.id);
          } else {
            console.error("Unexpected customer type:", subscriptionDeleted.customer);
          }
          break;

        case "invoice.payment_failed":
          const failedInvoice = event.data.object as Stripe.Invoice;

          if (typeof failedInvoice.customer === "string") {
            const user = await findUserByStripeCustomerId(failedInvoice.customer);

            if (!user) {
              console.error(`No user found for Stripe Customer ID: ${failedInvoice.customer}`);
              break;
            }

            console.warn(`Payment failed for user ID ${user.id}, invoice ID: ${failedInvoice.id}`);
          } else {
            console.error("Unexpected customer type:", failedInvoice.customer);
          }
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error handling Stripe webhook:", error);
      res.status(400).json({ error: "Webhook handler error" });
    }
  }
);

export default router;
