import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerOptions from './config/swagger';

import routes from './routes';
import { seedAdmin } from './seeds/seed-admin';

const app: Application = express();

// Middleware
app.use(express.json());

// Run admin seed logic
seedAdmin().catch((err) => {
    console.error('Error during admin seeding:', err);
    process.exit(1);
  });

// Generate Swagger documentation and server UI
const swaggerDocs = swaggerJsdoc({
  definition: swaggerOptions,
  apis: ['./src/routes/**/*.ts'], // Path to your route files
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

console.log('Swagger UI available at http://localhost:3000/api-docs');

// Routes
app.use('/api', routes);

export default app;
