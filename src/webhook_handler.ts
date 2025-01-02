import Stripe from "stripe";
import stripe from "./config/stripe";
import { findCheckoutBySessionId, updateCheckout } from "./models/checkouts.models";
import {
  createSubscription,
  getSubscriptionByStripeId,
  canceSubscription,
  updateSubscription,
} from "./models/subscriptions.models";

export interface Checkout {
  status: string; // add the status property
  // other properties
}

export async function webHookHandler(event: Stripe.Event) {
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log("***************************************");

      //   console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      handlePaymentIntentSucceeded(paymentIntent);
      console.log("***************************************");
      // Then define and call a method to handle the successful payment intent.
      break;

    case "payment_method.attached":
      const paymentMethod = event.data.object;
      //   console.log("PaymentMethod was attached to a Customer!");
      //   console.log("paymentMethod", paymentMethod);
      console.log("---------------------------------");

      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      handlePaymentMethodAttached(paymentMethod);
      console.log("---------------------------------");
      break;

    case "checkout.session.completed":
      const eventObject = event.data.object;
      // Payment is successful and the subscription is created.
      // You should provision the subscription and save the customer ID to your database.
      console.log("Checkout session was completed!");
      handleCheckoutCompleted(eventObject);
      break;

    case "customer.subscription.deleted":
      console.log("Customer subscription was deleted!");
      handleCustomerSubscriptionDeleted(event.data.object);
      break;

    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);

    //   if (
    //     event.type === 'checkout.session.completed'
    //     || event.type === 'checkout.session.async_payment_succeeded'
    //   ) {
    //     fulfillCheckout(event.data.object.id);
    //   }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Fulfill any orders, e-mail receipts, etc
  console.log("PaymentIntent was successful!");
  //   console.log(paymentIntent);
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  // Update payment method on customer
  console.log("PaymentMethod was attached to a Customer!");
  //   console.log(paymentMethod);
}

async function handleCustomerSubscriptionDeleted(event: Stripe.Subscription) {
  console.log("handleCustomerSubscriptionDeleted - Customer subscription was deleted!");
  console.log(event);
  canceSubscription(event.id);
  return;
}

async function handleCheckoutCompleted(checkoutSession: Stripe.Checkout.Session) {
  // Payment is successful and the subscription is created.
  // You should provision the subscription and save the customer ID to your database.
  console.log("handleCheckoutCompleted - Checkout session was completed!!!");
  const checkout = await findCheckoutBySessionId(checkoutSession.id);
  if (!checkout) {
    console.log("Checkout not found!");
    return;
  }
  console.log(checkoutSession);
  await updateCheckout(checkoutSession.id, {
    session_completed_status: "completed",
    metadata: checkoutSession,
  });
  
  let subscription = null;
  let product = null;

  //update the subscription status in the subscriptions table. Create this new subscription.
  if (checkoutSession.subscription && typeof checkoutSession.subscription === "string") {
    subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
    product = null;

    if (subscription?.items.data[0].plan.product) {
      console.log("subscription", subscription);
      const productId = subscription?.items.data[0].plan.product;

      if (typeof productId === "string") {
        product = await stripe.products.retrieve(productId);

        if (product) {
          // Check if the subscription exists in db
          const existingSubscription = await getSubscriptionByStripeId(
            checkoutSession.subscription
          );

          if (existingSubscription) {
            console.log("Webhook: Subscription already exists in db");
            await updateSubscription(existingSubscription.id, {
              status: subscription.status,
              next_billing_date: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : new Date(),
            });
          } else {
            await createSubscription(
              checkout.user_id,
              checkoutSession.subscription,
              product.name,
              subscription.status,
              subscription.start_date ? new Date(subscription.start_date * 1000) : new Date()
            );
          }
        } else {
          console.log("webhook: Invalid subscription type");
        }
      } else {
        console.log("webhook: Invalid subscription plan type");
      }
    } else {
      console.log("webhook: Invalid subscription plan product type");
    }
  } else {
    console.log("webhook: Invalid checkoutSession.subscription type");
  }

  //TODO: Cancel other subscriptions. Change status to 'canceled'. Update the end date to today.
  // Find other subs in the stripe. and cancel them.
  

  //TODO: the customer.subscription.deleted event.
}
