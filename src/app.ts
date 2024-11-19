import express, { Application } from 'express';
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

// Routes
app.use('/api', routes);

export default app;
