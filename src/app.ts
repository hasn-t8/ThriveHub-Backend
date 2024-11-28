import express, { Application } from "express";
const cors = require('cors');

import { seedUserTypes } from "./seeds/seed-user-types";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerOptions from "./config/swagger";
import routes from "./routes";
import { seedAdmin } from "./seeds/seed-admin";

const app: Application = express();

const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  app.use(cors());
} 

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
