import Stripe from "stripe";
import { saveStripeCustomerId, findStripeCustomerByUserId } from "../models/user.models";
import { createCheckout } from "../models/checkouts.models";
import stripe from "../config/stripe";

const websiteUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://thrivehub.ai";

const stripeClient = stripe;

/**
 * Handles subscription updates, including upgrades and downgrades.
 */
export const createOrSwitchSubscription = async (
  userId: number,
  userEmail: string,
  plan: string
): Promise<string> => {
  const planId = getPlan(plan);

  // Retrieve or create Stripe customer
  const existingCustomer = await findStripeCustomerByUserId(userId);
  let stripeCustomer: Stripe.Customer;

  if (existingCustomer) {
    stripeCustomer = (await stripeClient.customers.retrieve(existingCustomer)) as Stripe.Customer;
  } else {
    stripeCustomer = await stripeClient.customers.create({ email: userEmail });
    await saveStripeCustomerId(userId, stripeCustomer.id);
  }

  // List active subscriptions for the customer
  const subscriptions = await stripeClient.subscriptions.list({
    customer: stripeCustomer.id,
    status: "active",
  });

  let isSwitchingSubscription = false;

  for (const subscription of subscriptions.data) {
    if (subscription.items.data[0].plan.id === planId) {
      throw new Error("Subscription already exists.");
    } else {
      isSwitchingSubscription = true;

      // Cancel existing subscription at the end of the current period
      await stripeClient.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
    }
  }

  // Create new Checkout session for the new plan
  const session = await stripeClient.checkout.sessions.create({
    cancel_url: `${websiteUrl}/pricing`,
    success_url: `${websiteUrl}/pricing?session_id={CHECKOUT_SESSION_ID}&id=${userId}`,
    customer: stripeCustomer.id,
    line_items: [
      {
        price: planId,
        quantity: 1,
      },
    ],
    mode: "subscription",
  });

  // Record the checkout
  await createCheckout(userId, plan, planId, session.id, "pending", "none", {});

  if (!session.url) {
    throw new Error("Failed to create checkout session.");
  }
  return session.url;
};

/**
 * Maps plan names to Stripe price IDs.
 */
export const getPlan = (plan: string): string => {
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
      throw new Error("Invalid plan type.");
  }
};
