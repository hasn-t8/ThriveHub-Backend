import Stripe from "stripe";

// Load the Stripe secret key from environment variables
const STRIPE_API_KEY: string | undefined = process.env.STRIPE_API_KEY;

if (!STRIPE_API_KEY) {
  throw new Error("Stripe secret key is not defined in environment variables.");
}

// Initialize the Stripe instance
const stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export default stripe;

// export const STRIPE_API_KEY = process.env.STRIPE_API_KEY || "your_stripe_api_key";
// export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "your_webhook_secret";

// // Product A Plans
// export const STRIPE_PRODUCT_A_MONTHLY = process.env.STRIPE_PRODUCT_A_MONTHLY || "your_product_a_monthly_price_id";
// export const STRIPE_PRODUCT_A_YEARLY = process.env.STRIPE_PRODUCT_A_YEARLY || "your_product_a_yearly_price_id";

// // Product B Plans
// export const STRIPE_PRODUCT_B_MONTHLY = process.env.STRIPE_PRODUCT_B_MONTHLY || "your_product_b_monthly_price_id";
// export const STRIPE_PRODUCT_B_YEARLY = process.env.STRIPE_PRODUCT_B_YEARLY || "your_product_b_yearly_price_id";

// // Currency
// export const STRIPE_CURRENCY = process.env.STRIPE_CURRENCY || "gbp";

// // export const stripe = {
// //     STRIPE_API_KEY: process.env.STRIPE_API_KEY || "your_stripe_api_key",
// //     STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "your_webhook_secret",
// //     STRIPE_PRODUCT_A_MONTHLY: process.env.STRIPE_PRODUCT_A_MONTHLY || "your_product_a_monthly_price_id",
// //     STRIPE_PRODUCT_A_YEARLY: process.env.STRIPE_PRODUCT_A_YEARLY || "your_product_a_yearly_price_id",
// //     STRIPE_PRODUCT_B_MONTHLY: process.env.STRIPE_PRODUCT_B_MONTHLY || "your_product_b_monthly_price_id",
// //     STRIPE_PRODUCT_B_YEARLY: process.env.STRIPE_PRODUCT_B_YEARLY || "your_product_b_yearly_price_id",
// //     STRIPE_CURRENCY: process.env.STRIPE_CURRENCY || "gbp"
// // }
