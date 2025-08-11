import type { Express } from "express";
import { createServer } from "http";
import { registerUserRoutes } from './userRoutes';
import { registerItemRoutes } from './itemRoutes';
import { registerPaymentRoutes } from './paymentRoutes';
import { registerFileRoutes } from './fileRoutes';
import { registerAIRoutes } from './aiRoutes';
import { registerThreadRoutes } from './threadRoutes';

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Register all route modules (webhooks are registered separately before JSON middleware)
  await registerUserRoutes(app);
  await registerItemRoutes(app);
  await registerPaymentRoutes(app);
  await registerFileRoutes(app);
  await registerAIRoutes(app);
  await registerThreadRoutes(app);

  return server;
}