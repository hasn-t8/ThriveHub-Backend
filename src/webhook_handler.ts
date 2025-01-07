import Stripe from "stripe";
import stripe from "./config/stripe";
import { findCheckoutBySessionId, updateCheckout } from "./models/checkouts.models";
import {
  createSubscription,
  getSubscriptionByStripeId,
  canceSubscription,
  updateSubscription,
} from "./models/subscriptions.models";
import { findUserByStripeCustomerId, saveStripeCustomerId } from "./models/user.models";
import { recordWebhookEvent } from "./models/webhooks-stripe.models";

export async function webHookHandler(event: Stripe.Event): Promise<void> {
  console.log(`Processing event type: ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleCustomerSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}.`);
        break;
    }
  } catch (error) {
    console.error(
      `Error processing event type ${event.type}:`,
      error instanceof Error ? error.message : error
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  recordWebhookEvent(paymentIntent.id, "payment_intent.succeeded", {
    paymentIntent,
    action: "succeeded",
  });
  console.log("PaymentIntent succeeded!");
  console.log(`PaymentIntent for amount ${paymentIntent.amount} was successful.`);
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  console.log("PaymentMethod was attached to a Customer.");
  recordWebhookEvent(paymentMethod.id, "payment_method.attached", {
    paymentMethod,
    action: "attached",
  });
}

async function handleCheckoutCompleted(checkoutSession: Stripe.Checkout.Session): Promise<void> {
  console.log("Checkout session completed!");

  const checkout = await findCheckoutBySessionId(checkoutSession.id);
  if (!checkout) {
    console.error("Checkout not found!");
    return;
  }
  recordWebhookEvent(checkoutSession.id, "checkout.session.completed", {
    checkoutSession,
    action: "completed",
  });

  await updateCheckout(checkoutSession.id, {
    session_completed_status: "completed",
    metadata: checkoutSession,
  });

  if (checkoutSession.subscription && typeof checkoutSession.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);

    if (subscription) {
      const productId = subscription.items.data[0]?.plan.product;
      const product =
        typeof productId === "string" ? await stripe.products.retrieve(productId) : null;

      const planId = subscription.items.data[0]?.price.id;
      const plan = planId ? await stripe.prices.retrieve(planId) : null;

      const interval = plan?.recurring?.interval;
      const prefixedProductName =
        interval === "month"
          ? `MONTHLY-${product?.name || "Unknown"}`
          : interval === "year"
            ? `YEARLY-${product?.name || "Unknown"}`
            : product?.name || "Unknown";

      const existingSubscription = await getSubscriptionByStripeId(subscription.id);

      if (!existingSubscription) {
        console.log("Creating new subscription in database.");
        await createSubscription(
          checkout.user_id,
          subscription.id,
          prefixedProductName,
          subscription.status,
          subscription.start_date ? new Date(subscription.start_date * 1000) : new Date(),
          subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : new Date()
        );
      } else {
        console.log("Subscription already exists. Updating status.");
        await updateSubscription(existingSubscription.id, {
          status: subscription.status,
          next_billing_date: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        });
      }
    } else {
      console.error("Invalid subscription plan product type.");
    }
  }
}

async function handleCustomerSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription created!");
  recordWebhookEvent(subscription.id, "customer.subscription.created", {
    subscription,
    action: "created",
  });
  await processSubscription(subscription, "created");
}

async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription updated!");

  // Check if the subscription is set to change at the end of the current billing cycle
  if (subscription.pending_update) {
    recordWebhookEvent(subscription.id, "customer.subscription.updated", {
      subscription,
      action: "pending_update",
    });
    console.log(
      `Subscription ${subscription.id} has a pending update that will take effect at the next billing cycle.`
    );
  } else {
    recordWebhookEvent(subscription.id, "customer.subscription.updated", {
      subscription,
      action: "updated",
    });
    console.log(`Subscription ${subscription.id} has been updated.`);
  }

  await processSubscription(subscription, "updated");
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription deleted!");
  recordWebhookEvent(subscription.id, "customer.subscription.deleted", {
    subscription,
    action: "deleted",
  });
  if (subscription.cancel_at_period_end) {
    console.log(
      `Subscription ${subscription.id} has been cancelled at the end of the current billing cycle.`
    );
    if (!subscription.cancel_at) {
      console.error("Invalid cancel_at timestamp in subscription.");
      return;
    }
    const cancelAt = new Date(subscription.cancel_at * 1000);
    await canceSubscription(subscription.id, cancelAt);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log("Invoice payment succeeded!");
  recordWebhookEvent(invoice.id, "invoice.payment_succeeded", { invoice, action: "succeeded" });
  if (typeof invoice.subscription !== "string") {
    console.error("Invalid subscription ID in invoice.");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const existingSubscription = await getSubscriptionByStripeId(subscription.id);

  if (!existingSubscription) {
    console.error("No matching subscription found in database for payment.");
    return;
  }

  await updateSubscription(existingSubscription.id, {
    status: subscription.status,
    next_billing_date: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
  });

  console.log("Subscription payment successfully updated in database.");
}

export async function processSubscription(
  subscription: Stripe.Subscription,
  action: string
): Promise<void> {
  const customerId = subscription.customer;
  console.log('customerId', customerId);
  
  if (typeof customerId !== "string") {
    console.error(`Invalid customer ID in subscription ${action} event.`);
    return;
  }

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer ID: ${customerId}`);
    return;
  }

  const productId = subscription.items.data[0]?.plan.product;
  const product = typeof productId === "string" ? await stripe.products.retrieve(productId) : null;

  const planId = subscription.items.data[0]?.price.id;
  const plan = planId ? await stripe.prices.retrieve(planId) : null;

  const interval = plan?.recurring?.interval;
  const prefixedProductName =
    interval === "month"
      ? `MONTHLY-${product?.name || "Unknown"}`
      : interval === "year"
        ? `YEARLY-${product?.name || "Unknown"}`
        : product?.name || "Unknown";

  const existingSubscription = await getSubscriptionByStripeId(subscription.id);

  if (!existingSubscription) {
    console.log(
      `No matching subscription found in database. Creating new subscription (${action}).`
    );
    await createSubscription(
      user.id,
      subscription.id,
      prefixedProductName,
      subscription.status,
      subscription.start_date ? new Date(subscription.start_date * 1000) : new Date(),
      subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : new Date()
    );
  } else {
    console.log(`Updating subscription (${action}) in database.`);
    await updateSubscription(existingSubscription.id, {
      status: subscription.status,
      next_billing_date: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    });
  }

  if (existingSubscription && subscription.cancel_at_period_end) {
    console.log(
      `Subscription ${subscription.id} has been cancelled at the end of the current billing cycle.`
    );
    if (!subscription.cancel_at) {
      console.error("Invalid cancel_at timestamp in subscription.");
      return;
    }
    const cancelAt = new Date(subscription.cancel_at * 1000);
    console.log("cancelAt", cancelAt);
    console.log("subscription.id", subscription.id);

    await canceSubscription(subscription.id, cancelAt);
  }
}
