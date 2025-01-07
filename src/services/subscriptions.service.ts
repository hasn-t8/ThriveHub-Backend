import Stripe from "stripe";
import { saveStripeCustomerId, findStripeCustomerByUserId } from "../models/user.models";
import { createCheckout } from "../models/checkouts.models";
import stripe from "../config/stripe";
import { getSubscriptionByStripeId, updateSubscription } from "../models/subscriptions.models";
// import { processSubscription } from "../webhook_handler";

const websiteUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://thrivehub.ai";

const stripeClient = stripe;

/**
 * Handles subscription creation or switching, reusing default payment methods when available.
 */
export const createOrSwitchSubscription = async (
  userId: number,
  userEmail: string,
  plan: string
): Promise<string> => {
  const planId = getPlan(plan);

  // Retrieve or create Stripe customer
  const existingCustomer = await findStripeCustomerByUserId(userId);
  console.log("existingCustomer", existingCustomer);

  let retrievedCustomer: Stripe.Customer | null;
  let stripeCustomer: Stripe.Customer | null = null;

  if (existingCustomer) {
    retrievedCustomer = await retrieveStripeCustomer(existingCustomer);
    if (!retrievedCustomer) {
      retrievedCustomer = await findCustomerByEmail(userEmail);
      if (retrievedCustomer) {
        await saveStripeCustomerId(userId, retrievedCustomer.id);
        stripeCustomer = retrievedCustomer;
      }
    } else {
      stripeCustomer = retrievedCustomer;
    }
  }

  if (!stripeCustomer) {
    stripeCustomer = await stripeClient.customers.create({ email: userEmail });
    await saveStripeCustomerId(userId, stripeCustomer.id);
  }

  console.log("***** Stripe customer -------------------");
  console.log("stripeCustomer", stripeCustomer);

  // Check if the customer has a default payment method
  const paymentMethods = await stripeClient.paymentMethods.list({
    customer: stripeCustomer.id,
    type: "card",
  });

  const defaultPaymentMethod = paymentMethods.data[0]; // Assume the first one is default
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

  // If default payment method exists, create the subscription directly
  if (defaultPaymentMethod) {
    const newSubscription = await stripeClient.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: planId }],
      default_payment_method: defaultPaymentMethod.id,
      expand: ["latest_invoice.payment_intent"],
    });

    // Record the subscription creation
    await createCheckout(userId, plan, planId, newSubscription.id, "pending", "none", {});

    return `Subscription switched successfully. Subscription ID: ${newSubscription.id}`;
  }

  // If no default payment method, fallback to Checkout session
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

export async function findCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
  try {
    const customers = await stripeClient.customers.list({
      email, // Filter by email
      limit: 1, // Only fetch the first matching customer
    });

    // Check if any customer matches
    if (customers.data.length > 0) {
      let customer = customers.data[0];
      if (customer.deleted) {
        console.error(`Customer found with email ${email} is deleted.`);
        return null;
      }
      return customers.data[0]; // Return the first match
    }

    return null; // No matching customer found
  } catch (error) {
    console.error("Error retrieving customer by email:", error);
    throw error;
  }
}

export async function retrieveStripeCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = (await stripeClient.customers.retrieve(customerId)) as Stripe.Customer;
    if (customer.deleted) {
      console.error(`Customer found with ID ${customerId} is deleted.`);
      return null;
    }
    return customer;
  } catch (error) {
    console.error(`Error retrieving Stripe customer with ID ${customerId}:`, error);
    return null;
  }
}

/**
 * Cancels a Stripe subscription.
 * @param subscriptionId - The ID of the subscription to cancel.
 * @param cancelAtPeriodEnd - If true, cancels the subscription at the end of the billing period. If false, cancels immediately.
 * @returns The updated subscription object after cancellation.
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  try {
    // Update the subscription to cancel at the end of the billing period or immediately
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    console.log(
      `Subscription ${subscriptionId} ${
        cancelAtPeriodEnd ? "scheduled for cancellation at period end" : "canceled immediately."
      }`
    );

    const sub_id = await getSubscriptionByStripeId(subscriptionId);

    console.log("sub_id", sub_id?.id);

    if (sub_id) {
      await updateSubscription(sub_id.id, {
        status: updatedSubscription.status,
        end_date: updatedSubscription.cancel_at_period_end
          ? new Date(updatedSubscription.current_period_end * 1000)
          : new Date(),
      });
    }
    return updatedSubscription;
  } catch (error) {
    console.error(
      `Error canceling subscription ${subscriptionId}:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}
