import "dotenv/config";
import type { Server } from "node:http";
import { validateEnv } from "./config/env.js";
import { createApp } from "./app.js";
import { disconnectPrisma } from "./database/prisma.js";
import { logger } from "./utils/logger.js";

// ── Validate Environment at Startup ─────────────────────────────────────────
// Throws a clear, formatted error without starting if environment is invalid.
const env = validateEnv();

// ── Instantiate Application ────────────────────────────────────────────────
const app = createApp(env);

// ── Start HTTP Listener ─────────────────────────────────────────────────────
const PORT = env.PORT;

const server: Server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      env: env.NODE_ENV,
      healthEndpoint: `http://localhost:${PORT}/api/health`,
      docsEndpoint: `http://localhost:${PORT}/api/docs`,
    },
    `PERALAGAE Backend API running on port ${PORT}`,
  );

  // Background sync of legacy settings and media to MongoDB
  import("./services/hero-service.js")
    .then(({ HeroService }) => HeroService.syncLegacyData())
    .catch((err) => logger.warn({ err }, "Initial hero sync failed"));

  import("./services/hero-media-service.js")
    .then(({ HeroMediaService }) => HeroMediaService.syncDiskToDatabase())
    .catch((err) => logger.warn({ err }, "Initial media sync failed"));

  import("./services/category-media-service.js")
    .then(({ CategoryMediaService }) => CategoryMediaService.syncLocalDiskImagesToDb())
    .catch((err) => logger.warn({ err }, "Initial category media sync failed"));

  import("./services/product-media-service.js")
    .then(({ ProductMediaService }) => ProductMediaService.syncLocalDiskImagesToDb())
    .catch((err) => logger.warn({ err }, "Initial product media sync failed"));

  import("./services/material-service.js")
    .then(({ MaterialService }) => MaterialService.seedInitialData())
    .catch((err) => logger.warn({ err }, "Initial material seed failed"));

  import("./services/material-media-service.js")
    .then(({ MaterialMediaService }) => MaterialMediaService.syncDiskToDatabase())
    .catch((err) => logger.warn({ err }, "Initial material media sync failed"));

  import("./services/instagram-service.js")
    .then(({ InstagramService }) => InstagramService.seedInitialData())
    .catch((err) => logger.warn({ err }, "Initial instagram seed failed"));

  import("./services/instagram-media-service.js")
    .then(({ InstagramMediaService }) => InstagramMediaService.syncDiskToDatabase())
    .catch((err) => logger.warn({ err }, "Initial instagram media sync failed"));

  import("./services/store-details-service.js")
    .then(({ StoreDetailsService }) => StoreDetailsService.seedInitialData())
    .catch((err) => logger.warn({ err }, "Initial store details seed failed"));

  import("./services/faq-service.js")
    .then(({ FaqService }) => FaqService.seedInitialData())
    .catch((err) => logger.warn({ err }, "Initial FAQ seed failed"));

  // Verify SMTP connectivity at startup without crashing application
  import("./services/email/email-service.js")
    .then(({ EmailService }) => EmailService.verifyConnection())
    .catch((err) => logger.warn({ err }, "Initial SMTP connection verification failed"));
});

// ── Graceful Process Shutdown ───────────────────────────────────────────────
let isShuttingDown = false;

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info({ signal }, `Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new incoming requests
  server.close(async () => {
    logger.info("HTTP server closed.");

    // Cleanly close database connections
    await disconnectPrisma();

    logger.info("Graceful shutdown completed successfully.");
    process.exit(0);
  });

  // Force shutdown after timeout if pending connections hang
  setTimeout(() => {
    logger.error("Graceful shutdown timed out after 10s. Forcing exit.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
process.on("SIGINT", () => void handleShutdown("SIGINT"));

export { server };
