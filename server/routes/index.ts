import type { Express } from "express";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from '../replit_integrations/auth';
import { registerUserRoutes } from './userRoutes';
import { registerItemRoutes } from './itemRoutes';
import { registerPaymentRoutes } from './paymentRoutes';
import { registerChatKitRoutes } from './chatKitRoutes';

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Setup Replit Auth BEFORE registering other routes
  await setupAuth(app);
  registerAuthRoutes(app);

  // Register all route modules (webhooks are registered separately before JSON middleware)
  await registerUserRoutes(app);
  await registerItemRoutes(app);
  await registerPaymentRoutes(app);
  await registerChatKitRoutes(app);

  return server;
}
