import Stripe from "stripe";
import stripe from "./config/stripe";
import { findCheckoutBySessionId, updateCheckout } from "./models/checkouts.models";
import {
  createSubscription,
  getSubscriptionByStripeId,
  canceSubscription,
  updateSubscription,
} from "./models/subscriptions.models";

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

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
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
  // Additional logic for successful payment can go here
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  console.log("PaymentMethod was attached to a Customer.");
  // Additional logic for handling attached payment methods
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

    if (subscription.items.data[0]?.plan.product) {
      const productId = subscription.items.data[0].plan.product;
      const product = await stripe.products.retrieve(productId as string);

      if (product) {
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
            product.name,
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

  // Optional: Cancel other subscriptions
  if (typeof checkoutSession.subscription === "string") {
    await cancelOtherSubscriptions(checkout.user_id, checkoutSession.subscription);
  } else {
    console.error("Invalid subscription ID for canceling other subscriptions.");
  }
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log("Customer subscription deleted!");
  await canceSubscription(subscription.id);
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
