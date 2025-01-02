import express, { Router, Request, Response } from "express";
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
  getSubscriptionsByUser,
  createSubscription,
  deleteSubscription,
} from "../models/subscriptions.models";

import { createCheckout } from "../models/checkouts.models";

import stripe from "../config/stripe";
// const endpointSecret = 'whsec_8ba5198a77107a175a6378a939be8dce21ca5d6d7563244337d67170aaba3a63';
let website_url;
if (process.env.NODE_ENV === "development") {
  website_url = "http://localhost:5173";
} else {
  website_url = "https://thrivehub.ai";
}

const router = Router();

// Validation middleware for subscription creation
const validateSubscription = [
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

router.post(
  "/subscription",
  verifyToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(400).json({ error: "User ID and email are required" });
      return;
    }

    if (!req.body.plan) {
      res.status(400).json({ error: "Plan is required" });
      return;
    } else {
      if (
        req.body.plan !== "basic_monthly" &&
        req.body.plan !== "basic_yearly" &&
        req.body.plan !== "premium_monthly" &&
        req.body.plan !== "premium_yearly"
      ) {
        res.status(400).json({ error: "Invalid plan type" });
        return;
      }
    }
    const plan = req.body.plan;

    try {
      // Retrieve or Create Stripe Customer
      const existingCustomer: string | null = await findStripeCustomerByUserId(userId);
      console.log("existingCustomer", existingCustomer);

      let stripeCustomer: Stripe.Customer;

      if (existingCustomer) {
        stripeCustomer = (await stripe.customers.retrieve(existingCustomer)) as Stripe.Customer;
      } else {
        console.log("Creating new Stripe customer");
        stripeCustomer = await stripe.customers.create({ email: userEmail });
        await saveStripeCustomerId(userId, stripeCustomer.id);
      }

      if (!stripeCustomer || "deleted" in stripeCustomer) {
        console.log("Failed to retrieve the Stripe customer or the customer is deleted.");
        stripeCustomer = await stripe.customers.create({ email: userEmail });
        await saveStripeCustomerId(userId, stripeCustomer.id);
        // throw new Error("Failed to retrieve the Stripe customer or the customer is deleted.");
      }

      // if (subscriptions.data.length > 0) {
      //   res.status(400).json({ error: "Subscription already exists" });
      //   return;
      // }

      // const prices = await stripe.prices.list({
      //   lookup_keys: [req.body.lookup_key],
      //   expand: ['data.product'],
      // });

      // const plan = "basic_monthly";
      const plan_id = getPlan(plan);
      console.log("plan_id", plan_id);

      //Check if the existing plan is already active. if so, return an error
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomer.id,
        status: "active",
      });
      let user_switching_subscription = false;
      let active_subscription = '';
      // console.log('subscriptions', subscriptions);
      for (const subscription of subscriptions.data) {
        // console.log("subscription", subscription);

        if (subscription.items.data[0].plan.id === getPlan(plan)) {
          // console.log("------<<<>>>------");
          console.log("subscription.items.data[0].plan.id", subscription.items.data[0].plan.id);
          res.status(400).json({ error: "Subscription already exists" });
          return;
        } else {
          console.log('subscription.items.data[0].plan.id', subscription.items.data[0].plan.id);
          user_switching_subscription = true;
        }
      }
      console.log("user_switching_subscription", user_switching_subscription);
      // //TODO: check if the user is switching subscription. If so, cancel the existing subscription and create a new one. Handle on webhook.

      const session = await stripe.checkout.sessions.create({
        cancel_url: website_url + "/pricing",
        success_url: website_url + "/pricing?session_id={CHECKOUT_SESSION_ID}&id=" + userId,
        customer: stripeCustomer.id,
        line_items: [
          {
            price: plan_id,
            quantity: 1,
          },
        ],
        mode: "subscription",
      });

      // Create a Checkout record
      createCheckout(userId, plan, plan_id, session.id, "pending", "none", {});

      res.status(200).json(session.url);
      return;

      // // Create a Setup Intent for the Customer
      // const setupIntent = await stripe.setupIntents.create({
      //   customer: stripeCustomer.id,
      //   usage: "off_session",
      //   return_url: process.env.STRIPE_RETURN_URL,
      // });

      // res.status(200).json({
      //   // url: setupIntent.next_action.use_stripe_sdk.url,
      //   clientSecret: setupIntent.client_secret,
      //   customer_id: stripeCustomer.id,
      // });
      // return;
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
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

function getPlan(plan: string): string {
  switch (plan) {
    case "basic_monthly":
      return process.env.STRIPE_BASIC_MONTHLY as string;
    case "basic_yearly":
      return process.env.STRIPE_BASIC_YEARLY as string;
    case "premium_monthly":
      return process.env.STRIPE_PREMIUM_MONTHLY as string;
    case "premium_yearly":
      return process.env.STRIPE_PREMIUM_YEARLY as string;
    default:
      throw new Error("Invalid plan type");
  }
}

export default router;

// // Handle Stripe Webhooks
// router.post(
//   "/webhook",
//   express.raw({ type: "application/json" }), // Ensure the raw body is sent
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const sig = req.headers["stripe-signature"];

//     if (!sig) {
//       res.status(400).json({ error: "Missing Stripe signature" });
//       return;
//     }

//     try {
//       const event = stripe.webhooks.constructEvent(
//         req.body,
//         sig,
//         process.env.STRIPE_WEBHOOK_SECRET as string
//       );

//       await recordWebhookEvent(event.id, event.type, event.data.object);

//       switch (event.type) {
//         case "invoice.payment_succeeded":
//           const invoice = event.data.object as Stripe.Invoice;

//           if (typeof invoice.customer === "string") {
//             const user = await findUserByStripeCustomerId(invoice.customer);

//             if (!user) {
//               console.error(`No user found for Stripe Customer ID: ${invoice.customer}`);
//               break;
//             }

//             await recordPayment(
//               user.id,
//               invoice.id,
//               invoice.amount_paid / 100,
//               invoice.currency,
//               invoice.status ?? "unknown"
//             );
//           } else {
//             console.error("Unexpected customer type:", invoice.customer);
//           }
//           break;

//         case "customer.subscription.created":
//           const subscriptionCreated = event.data.object as Stripe.Subscription;

//           if (typeof subscriptionCreated.customer === "string") {
//             const user = await findUserByStripeCustomerId(subscriptionCreated.customer);

//             if (!user) {
//               console.error(
//                 `No user found for Stripe Customer ID: ${subscriptionCreated.customer}`
//               );
//               break;
//             }
//             await handleSubscriptionCreated(user.id, subscriptionCreated);
//           } else {
//             console.error("Unexpected customer type:", subscriptionCreated.customer);
//           }
//           break;

//         case "customer.subscription.updated":
//           const subscriptionUpdated = event.data.object as Stripe.Subscription;

//           if (typeof subscriptionUpdated.customer === "string") {
//             const user = await findUserByStripeCustomerId(subscriptionUpdated.customer);

//             if (!user) {
//               console.error(
//                 `No user found for Stripe Customer ID: ${subscriptionUpdated.customer}`
//               );
//               break;
//             }
//             await handleSubscriptionUpdated(user.id, subscriptionUpdated);
//           } else {
//             console.error("Unexpected customer type:", subscriptionUpdated.customer);
//           }
//           break;

//         case "customer.subscription.deleted":
//           const subscriptionDeleted = event.data.object as Stripe.Subscription;

//           if (typeof subscriptionDeleted.customer === "string") {
//             const user = await findUserByStripeCustomerId(subscriptionDeleted.customer);

//             if (!user) {
//               console.error(
//                 `No user found for Stripe Customer ID: ${subscriptionDeleted.customer}`
//               );
//               break;
//             }
//             await handleSubscriptionDeleted(user.id, subscriptionDeleted.id);
//           } else {
//             console.error("Unexpected customer type:", subscriptionDeleted.customer);
//           }
//           break;

//         case "invoice.payment_failed":
//           const failedInvoice = event.data.object as Stripe.Invoice;

//           if (typeof failedInvoice.customer === "string") {
//             const user = await findUserByStripeCustomerId(failedInvoice.customer);

//             if (!user) {
//               console.error(`No user found for Stripe Customer ID: ${failedInvoice.customer}`);
//               break;
//             }

//             console.warn(`Payment failed for user ID ${user.id}, invoice ID: ${failedInvoice.id}`);
//           } else {
//             console.error("Unexpected customer type:", failedInvoice.customer);
//           }
//           break;

//         default:
//           console.log(`Unhandled event type: ${event.type}`);
//       }

//       res.status(200).json({ received: true });
//     } catch (error) {
//       console.error("Error handling Stripe webhook:", error);
//       res.status(400).json({ error: "Webhook handler error" });
//     }
//   }
// );

// Create a new subscription
// router.post(
//   "/subscriptions",
//   verifyToken,
//   validateSubscription,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       res.status(400).json({ errors: errors.array() });
//       return;
//     }

//     const userId = req.user?.id;
//     const { plan } = req.body;

//     if (!userId) {
//       res.status(400).json({ error: "User ID is required" });
//       return;
//     }

//     const userEmail = req.user?.email;
//     if (!userEmail) {
//       throw new Error("User email is not available.");
//     }

//     try {
//       // Check if Stripe customer already exists for the user
//       const existingCustomer: string | null = await findStripeCustomerByUserId(userId);
//       if (!existingCustomer) {
//         throw new Error("Failed to retrieve the Stripe customer.");
//       }

//       let stripeCustomer: Stripe.Customer;
//       stripeCustomer = (await stripe.customers.retrieve(existingCustomer)) as Stripe.Customer;

//       if (!stripeCustomer) {
//         throw new Error("NO Stripe customer exists.");
//       }

//       if (
//         !process.env.STRIPE_BASIC_MONTHLY ||
//         !process.env.STRIPE_BASIC_YEARLY ||
//         !process.env.STRIPE_PREMIUM_MONTHLY ||
//         !process.env.STRIPE_PREMIUM_YEARLY
//       ) {
//         throw new Error("Stripe price IDs are not configured properly.");
//       }

//       const plan_id = getPlan(plan);

//       console.log("plan_id", plan_id);

//       const stripeSubscription = await stripe.subscriptions.create({
//         customer: stripeCustomer.id,
//         items: [
//           {
//             price: plan_id,
//           },
//         ],
//         expand: ["latest_invoice.payment_intent"],
//       });

//       console.log("stripeSubscription", stripeSubscription);

//       // Handle Payment Intent
//       const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
//       const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
//       let subscriptionId: number | undefined;

//       if (paymentIntent && paymentIntent.status === "requires_action") {
//         res.status(200).json({
//           message: "Payment requires additional action",
//           clientSecret: paymentIntent.client_secret,
//         });
//         return;
//       } else if (paymentIntent && paymentIntent.status === "succeeded") {
//         subscriptionId = await createSubscription(
//           userId,
//           stripeSubscription.id,
//           plan,
//           stripeSubscription.status,
//           new Date(stripeSubscription.start_date * 1000),
//           stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : undefined,
//           stripeSubscription.current_period_end
//             ? new Date(stripeSubscription.current_period_end * 1000)
//             : undefined
//         );

//         res.status(201).json({
//           message: "Subscription created successfully",
//           subscriptionId,
//         });
//         return;
//       }

//       res.status(201).json({
//         message: "Subscription created successfully",
//         subscriptionId,
//       });
//     } catch (error) {
//       console.error("Error creating subscription:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

// // Update a subscription
// router.put(
//   "/subscriptions/:subscriptionId",
//   verifyToken,
//   async (req: AuthenticatedRequest, res: Response): Promise<void> => {
//     const subscriptionId = parseInt(req.params.subscriptionId, 10);

//     if (isNaN(subscriptionId)) {
//       res.status(400).json({ error: "Invalid Subscription ID" });
//       return;
//     }

//     const updates = req.body;

//     try {
//       await updateSubscription(subscriptionId, updates);
//       res.status(200).json({ message: "Subscription updated successfully" });
//     } catch (error) {
//       console.error("Error updating subscription:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );
