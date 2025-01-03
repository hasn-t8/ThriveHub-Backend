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
  console.log("PaymentIntent succeeded!");
  console.log(`PaymentIntent for amount ${paymentIntent.amount} was successful.`);
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  console.log("PaymentMethod was attached to a Customer.");
}

async function handleCheckoutCompleted(checkoutSession: Stripe.Checkout.Session): Promise<void> {
  console.log("Checkout session completed!");

  const checkout = await findCheckoutBySessionId(checkoutSession.id);
  if (!checkout) {
    console.error("Checkout not found!");
    return;
  }

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
          subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date()
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
  await processSubscription(subscription, "created");
}

async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription updated!");

  if (subscription.cancel_at_period_end) {
    console.log(
      `Subscription ${subscription.id} will switch to a new plan at the end of the billing cycle.`
    );
  }

  await processSubscription(subscription, "updated");
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription deleted!");
  await canceSubscription(subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log("Invoice payment succeeded!");

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

async function processSubscription(
  subscription: Stripe.Subscription,
  action: string
): Promise<void> {
  const customerId = subscription.customer;
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
}
