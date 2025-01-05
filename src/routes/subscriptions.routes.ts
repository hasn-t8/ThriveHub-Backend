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
  "/subscriptions/active",
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

// Delete a subscription
router.delete(
  "/subscriptions/:subscriptionId",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const subscriptionId = req.params.subscriptionId;

    if (!subscriptionId) {
      res.status(400).json({ error: "Invalid Subscription ID" });
      return;
    }

    try {
      await cancelSubscription(subscriptionId);
      res.status(200).json({ message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling the subscription:", error);
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
      const sessionUrl = await createOrSwitchSubscription(userId, userEmail, plan);
      res.status(200).json({ url: sessionUrl });
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

    console.log("req.body.session_id", req.body);

    try {
      const session = await stripe.checkout.sessions.retrieve(req.body.session_id);
      console.log("session", session);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      if (session.subscription && typeof session.subscription === "string") {
        subscription = await stripe.subscriptions.retrieve(session.subscription);
      }
      if (subscription?.items.data[0].plan.product) {
        console.log("subscription", subscription);
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