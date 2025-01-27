import express, { Application, Request, Response } from "express";
const cors = require("cors");

// import { seedUserTypes } from "./seeds/seed-user-types";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerOptions from "./config/swagger";
import routes from "./routes";
import { webHookHandler } from "./webhook_handler";
// import { seedAdmin } from "./seeds/seed-admin";

const app: Application = express();

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
import stripe from "./config/stripe";

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (request: Request, response: Response): Promise<void> => {
    let event = request.body;
    if (!event) {
      console.log("⚠️  Webhook error: No event found in request body.");
      response.sendStatus(400);
      return;
    }
    // Only verify the event if you have an endpoint secret defined.
    // Otherwise use the basic event deserialized with JSON.parse
    if (endpointSecret) {
      // Get the signature sent by Stripe
      const signature = request.headers["stripe-signature"];
      // console.log("signature -----------", signature);
      if (!signature) {
        console.log("⚠️  Webhook signature missing.");
        throw new Error("Missing Stripe signature");
      }
      try {
        event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
      } catch (err) {
        if (err instanceof Error) {
          console.log(`⚠️  Webhook signature verification failed.`, err.message);
        } else {
          console.log(`⚠️  Webhook signature verification failed.`);
        }
        response.sendStatus(400);
        return;
      }
    }
    webHookHandler(event);
    response.send(); // Return a 200 response to acknowledge receipt of the event
    return;
  }
);

const isProduction = process.env.NODE_ENV === "production";
// if (!isProduction) {
app.use(cors());
// }

// Middleware
app.use(express.json());

// seedUserTypes().catch((err) => {
//   console.error("Error during userTypes seeding:", err);
//   process.exit(1);
// });
// // initializeApp();

// // Run admin seed logic
// seedAdmin().catch((err) => {
//   console.error("Error during admin seeding:", err);
//   process.exit(1);
// });

// Generate Swagger documentation and server UI
const swaggerDocs = swaggerJsdoc({
  definition: swaggerOptions,
  apis: ["./src/routes/**/*.ts"], // Path to your route files
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use("/api", routes);

export default app;
