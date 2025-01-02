import Stripe from "stripe";
import stripe from "./config/stripe";
import { findCheckoutBySessionId, updateCheckout } from "./models/checkouts.models";
import {
  createSubscription,
  getSubscriptionByStripeId,
  canceSubscription,
  updateSubscription,
} from "./models/subscriptions.models";
import { findUserByStripeCustomerId } from "./models/user.models";

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
    if (error instanceof Error) {
      console.error(`Error processing event type ${event.type}:`, error.message);
    } else {
      console.error(`Error processing event type ${event.type}:`, error);
    }
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

    if (typeof subscription.items.data[0]?.plan.product === "string") {
      const productId = subscription.items.data[0].plan.product;
      const product = await stripe.products.retrieve(productId);

      if (product) {
        const planId = subscription.items.data[0].price.id;
        const plan = await stripe.prices.retrieve(planId);
        const interval = plan.recurring?.interval;

        // Add prefix based on interval
        const prefixedProductName =
          interval === "month"
            ? `MONTHLY-${product.name}`
            : interval === "year"
              ? `YEARLY-${product.name}`
              : product.name;

        const existingSubscription = await getSubscriptionByStripeId(checkoutSession.subscription);

        if (existingSubscription) {
          console.log("Updating existing subscription in database.");
          await updateSubscription(existingSubscription.id, {
            status: subscription.status,
            next_billing_date: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : new Date(),
          });
        } else {
          console.log("Creating new subscription in database.");
          await createSubscription(
            checkout.user_id,
            checkoutSession.subscription,
            prefixedProductName,
            subscription.status,
            subscription.start_date ? new Date(subscription.start_date * 1000) : new Date(),
            subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : new Date()
          );
        }
      } else {
        console.error("Product not found for subscription.");
      }
    } else {
      console.error("Invalid subscription plan product type.");
    }
  } else {
    console.error("Invalid or missing subscription in checkout session.");
  }

  if (typeof checkoutSession.subscription === "string") {
    await cancelOtherSubscriptions(checkout.user_id, checkoutSession.subscription);
  } else {
    console.error("Invalid subscription ID for canceling other subscriptions.");
  }
}

async function handleCustomerSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription created!");

  const customerId = subscription.customer;
  if (typeof customerId !== "string") {
    console.error("Invalid customer ID in subscription event.");
    return;
  }

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer ID: ${customerId}`);
    return;
  }

  const productId = subscription.items.data[0]?.plan.product;
  if (!productId || typeof productId !== "string") {
    console.error("Invalid product ID in subscription.");
    return;
  }

  const product = await stripe.products.retrieve(productId);
  if (!product) {
    console.error("Product not found for subscription.");
    return;
  }

  const planId = subscription.items.data[0].price.id;
  const plan = await stripe.prices.retrieve(planId);
  const interval = plan.recurring?.interval;

  const prefixedProductName =
    interval === "month"
      ? `MONTHLY-${product.name}`
      : interval === "year"
        ? `YEARLY-${product.name}`
        : product.name;

  const existingSubscription = await getSubscriptionByStripeId(subscription.id);
  if (existingSubscription) {
    console.log("Subscription already exists in database.");
    return;
  }

  await createSubscription(
    user.id,
    subscription.id,
    prefixedProductName,
    subscription.status,
    subscription.start_date ? new Date(subscription.start_date * 1000) : new Date(),
    subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date()
  );

  console.log("Subscription successfully created in database.");
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

async function cancelOtherSubscriptions(
  userId: number,
  currentSubscriptionId: string
): Promise<void> {
  const subscriptions = await stripe.subscriptions.list({
    customer: userId.toString(),
    status: "active",
  });

  for (const subscription of subscriptions.data) {
    if (subscription.id !== currentSubscriptionId) {
      console.log(`Canceling subscription ID: ${subscription.id}`);
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    }
  }
}
