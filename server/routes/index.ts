import type { Express } from "express";
import { createServer } from "http";
import { registerUserRoutes } from './userRoutes';
import { registerItemRoutes } from './itemRoutes';
import { registerPaymentRoutes } from './paymentRoutes';
import { registerWebhookRoutes } from './webhookRoutes';

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Register all route modules
  await registerWebhookRoutes(app);
  await registerUserRoutes(app);
  await registerItemRoutes(app);
  await registerPaymentRoutes(app);

  return server;
}