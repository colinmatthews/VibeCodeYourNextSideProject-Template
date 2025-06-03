import type { Express } from "express";
import { createServer } from "http";
import { registerUserRoutes } from './userRoutes.js';
import { registerItemRoutes } from './itemRoutes.js';
import { registerPaymentRoutes } from './paymentRoutes.js';
import { registerWebhookRoutes } from './webhookRoutes.js';

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Register all route modules
  await registerWebhookRoutes(app);
  await registerUserRoutes(app);
  await registerItemRoutes(app);
  await registerPaymentRoutes(app);

  return server;
}