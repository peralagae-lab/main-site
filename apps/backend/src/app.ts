import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import type { EnvConfig } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { healthRouter } from "./routes/health.js";
import { v1Router } from "./routes/v1/index.js";
import { createAdminAuthRouter } from "./routes/admin-auth.js";
import { createCustomerAuthRouter } from "./routes/customer-auth.js";
import { createOrderRouter } from "./routes/order.js";
import { createNavbarRouter } from "./routes/navbar.js";
import path from "node:path";
import { setupSwagger } from "./lib/swagger.js";
import { logger } from "./utils/logger.js";
import { createHeroRouter } from "./routes/hero.js";
import { HeroMediaService } from "./services/hero-media-service.js";
import { createCategoryRouter } from "./routes/category.js";
import { CategoryMediaService } from "./services/category-media-service.js";
import { createProductRouter } from "./routes/product.js";
import { ProductMediaService } from "./services/product-media-service.js";
import { createMaterialRouter } from "./routes/material.js";
import { MaterialMediaService } from "./services/material-media-service.js";
import { createInstagramRouter } from "./routes/instagram.js";
import { InstagramMediaService } from "./services/instagram-media-service.js";
import { createStoreDetailsRouter } from "./routes/store-details.js";
import { createGstRouter } from "./routes/gst.js";
import { createCartRouter } from "./routes/cart.js";
import { createEmailRouter } from "./routes/email.js";
import { createNewsletterRouter } from "./routes/newsletter.js";
import { createFaqRouter } from "./routes/faq.js";
import { createContactEnquiryRouter } from "./routes/contact-enquiry.js";
import { ShippingMediaService } from "./services/shipping-media-service.js";
import fs from "node:fs";

/**
 * Creates and configures the Express application.
 *
 * Separated from server startup so that integration tests can import the app
 * and run isolated requests via supertest without binding to a physical network port.
 */
export function createApp(env: EnvConfig): Application {
  const app = express();

  // ── Request correlation ID ───────────────────────────────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const headerId = req.headers["x-request-id"];
    const requestId = typeof headerId === "string" ? headerId : crypto.randomUUID();
    (req as Request & { id: string }).id = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  });

  // ── Normalize URL Slashes (e.g. //api -> /api from reverse proxies) ───────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url && req.url.startsWith("//")) {
      req.url = req.url.replace(/^\/\/+/, "/");
    }
    next();
  });

  // ── Security Headers ──────────────────────────────────────────────────────
  app.use(helmet());

  // ── Controlled CORS ───────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) {
          return callback(null, true);
        }

        // Automatically allow any Netlify, Render, or Vercel deployment domain (*.netlify.app, *.onrender.com, *.vercel.app)
        let isCloudDomain = false;
        try {
          const parsed = new URL(origin);
          if (
            parsed.hostname.endsWith(".netlify.app") ||
            parsed.hostname.endsWith(".onrender.com") ||
            parsed.hostname.endsWith(".vercel.app")
          ) {
            isCloudDomain = true;
          }
        } catch { }

        const isAllowed =
          env.CORS_ORIGINS.includes(origin) ||
          isCloudDomain ||
          (env.NODE_ENV !== "production" && env.CORS_ORIGINS.includes("*"));

        if (isAllowed) {
          return callback(null, true);
        }

        return callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
      },
      credentials: true,
    }),
  );

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Cookie Parsing for Server-Managed Admin Sessions ──────────────────────
  app.use(cookieParser());

  // ── Structured Request Logging ───────────────────────────────────────────
  if (env.NODE_ENV !== "test") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const requestId = (req as Request & { id: string }).id;

      res.on("finish", () => {
        const durationMs = Date.now() - start;
        logger.info(
          {
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            ip: req.ip,
          },
          "HTTP Request completed",
        );
      });

      next();
    });
  }

  // ── Body Parsing with Safe Limits & Raw Body Capture for Signature Verification ───
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as any).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ── API Documentation (Future Integration Point) ──────────────────────────
  setupSwagger(app);

  // ── Infrastructure Health & API Routes ──────────────────────────────────
  // Primary infrastructure health check (liveness & database readiness)
  app.use("/api/health", healthRouter);

  // Admin Authentication endpoints
  const adminAuthRouter = createAdminAuthRouter(env);
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/v1/admin/auth", adminAuthRouter);

  // Customer Authentication endpoints
  const customerAuthRouter = createCustomerAuthRouter(env);
  app.use("/api/auth", customerAuthRouter);
  app.use("/api/v1/auth", customerAuthRouter);

  // Protected Checkout, Order & Razorpay Payment endpoints
  const orderRouter = createOrderRouter(env);
  app.use("/api/orders", orderRouter);
  app.use("/api/v1/orders", orderRouter);
  app.use("/api/checkout", orderRouter);
  app.use("/api/v1/checkout", orderRouter);
  app.use("/api/payments/razorpay", orderRouter);
  app.use("/api/v1/payments/razorpay", orderRouter);

  // Navbar Management endpoints (storefront public & admin protected)
  const navbarRouter = createNavbarRouter(env);
  app.use("/api/navbar", navbarRouter);
  app.use("/api/v1/navbar", navbarRouter);

  // Static uploads directory with cross-origin headers for images
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const heroUploadsDir = path.join(uploadsDir, "hero");
  const categoryUploadsDir = path.join(uploadsDir, "categories");
  const productUploadsDir = path.join(uploadsDir, "products");
  const materialUploadsDir = path.join(uploadsDir, "materials");
  const instagramUploadsDir = path.join(uploadsDir, "instagram");
  const shippingUploadsDir = path.join(uploadsDir, "shipping");

  // Durable media serving: fallback to MongoDB if local disk cache is missing (e.g. after Render restart)
  app.get("/uploads/hero/:filename", async (req: Request, res: Response, next: NextFunction) => {
    const filename = req.params["filename"];
    if (typeof filename !== "string" || !filename) {
      return next();
    }
    const localPath = path.join(heroUploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    try {
      const asset = await HeroMediaService.getAsset(filename);
      if (asset) {
        try {
          if (!fs.existsSync(heroUploadsDir)) {
            fs.mkdirSync(heroUploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, asset.data);
        } catch {
          // Ignore local disk cache write error
        }
        res.setHeader("Content-Type", asset.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(asset.data);
      }
    } catch (err) {
      logger.warn({ err, filename }, "Failed to fetch media asset from MongoDB");
    }
    next();
  });

  app.get("/uploads/categories/:filename", async (req: Request, res: Response, next: NextFunction) => {
    const filename = req.params["filename"];
    if (typeof filename !== "string" || !filename) {
      return next();
    }
    const localPath = path.join(categoryUploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    try {
      const asset = await CategoryMediaService.getAsset(filename);
      if (asset) {
        try {
          if (!fs.existsSync(categoryUploadsDir)) {
            fs.mkdirSync(categoryUploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, asset.data);
        } catch {
          // Ignore local disk cache write error
        }
        res.setHeader("Content-Type", asset.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(asset.data);
      }
    } catch (err) {
      logger.warn({ err, filename }, "Failed to fetch category media asset from MongoDB");
    }
    next();
  });

  app.get("/uploads/products/:filename", async (req: Request, res: Response, next: NextFunction) => {
    const filename = req.params["filename"];
    if (typeof filename !== "string" || !filename) {
      return next();
    }
    const localPath = path.join(productUploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    try {
      const asset = await ProductMediaService.getAsset(filename);
      if (asset) {
        try {
          if (!fs.existsSync(productUploadsDir)) {
            fs.mkdirSync(productUploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, asset.data);
        } catch {
          // Ignore local disk cache write error
        }
        res.setHeader("Content-Type", asset.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(asset.data);
      }
    } catch (err) {
      logger.warn({ err, filename }, "Failed to fetch product media asset from MongoDB");
    }
    next();
  });

  app.get("/uploads/materials/:filename", async (req: Request, res: Response, next: NextFunction) => {
    const filename = req.params["filename"];
    if (typeof filename !== "string" || !filename) {
      return next();
    }
    const localPath = path.join(materialUploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    try {
      const asset = await MaterialMediaService.getAsset(filename);
      if (asset) {
        try {
          if (!fs.existsSync(materialUploadsDir)) {
            fs.mkdirSync(materialUploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, asset.data);
        } catch {
          // Ignore local disk cache write error
        }
        res.setHeader("Content-Type", asset.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(asset.data);
      }
    } catch (err) {
      logger.warn({ err, filename }, "Failed to fetch material media asset from MongoDB");
    }
    next();
  });

  app.get("/uploads/instagram/:filename", async (req: Request, res: Response, next: NextFunction) => {
    const filename = req.params["filename"];
    if (typeof filename !== "string" || !filename) {
      return next();
    }
    const localPath = path.join(instagramUploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    try {
      const asset = await InstagramMediaService.getAsset(filename);
      if (asset) {
        try {
          if (!fs.existsSync(instagramUploadsDir)) {
            fs.mkdirSync(instagramUploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, asset.data);
        } catch {
          // Ignore local disk cache write error
        }
        res.setHeader("Content-Type", asset.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(asset.data);
      }
    } catch (err) {
      logger.warn({ err, filename }, "Failed to fetch instagram media asset from MongoDB");
    }
    next();
  });

  app.get("/uploads/shipping/:filename", async (req: Request, res: Response, next: NextFunction) => {
    const filename = req.params["filename"];
    if (typeof filename !== "string" || !filename) {
      return next();
    }
    const localPath = path.join(shippingUploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    try {
      const asset = await ShippingMediaService.getAsset(filename);
      if (asset) {
        try {
          if (!fs.existsSync(shippingUploadsDir)) {
            fs.mkdirSync(shippingUploadsDir, { recursive: true });
          }
          fs.writeFileSync(localPath, asset.data);
        } catch {
          // Ignore local disk cache write error
        }
        res.setHeader("Content-Type", asset.mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(asset.data);
      }
    } catch (err) {
      logger.warn({ err, filename }, "Failed to fetch shipping media asset from MongoDB");
    }
    next();
  });

  app.use(
    "/uploads",
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    })
  );

  // GST Settings endpoints (storefront public & admin protected)
  const gstRouter = createGstRouter(env);
  app.use("/api/gst", gstRouter);
  app.use("/api/v1/gst", gstRouter);

  // Hero Images Management endpoints (storefront public & admin protected)
  const heroRouter = createHeroRouter(env);
  app.use("/api/hero", heroRouter);
  app.use("/api/v1/hero", heroRouter);

  // Category Management endpoints (storefront public & admin protected)
  const categoryRouter = createCategoryRouter(env);
  app.use("/api/categories", categoryRouter);
  app.use("/api/v1/categories", categoryRouter);

  // Product Catalogue endpoints (storefront public & admin)
  const productRouter = createProductRouter(env);
  app.use("/api/products", productRouter);
  app.use("/api/v1/products", productRouter);

  // Material Management endpoints (storefront public & admin)
  const materialRouter = createMaterialRouter(env);
  app.use("/api/materials", materialRouter);
  app.use("/api/v1/materials", materialRouter);

  // Instagram Section Management endpoints (storefront public & admin)
  const instagramRouter = createInstagramRouter(env);
  app.use("/api/instagram", instagramRouter);
  app.use("/api/v1/instagram", instagramRouter);

  // Store Details Management endpoints (storefront public & admin)
  const storeDetailsRouter = createStoreDetailsRouter(env);
  app.use("/api/store-details", storeDetailsRouter);
  app.use("/api/v1/store-details", storeDetailsRouter);
  app.use("/api/footer", storeDetailsRouter);
  app.use("/api/v1/footer", storeDetailsRouter);

  // Customer Contact Enquiry endpoints (storefront public & admin management)
  const contactRouter = createContactEnquiryRouter(env);
  app.use("/api/contact", contactRouter);
  app.use("/api/v1/contact", contactRouter);

  // Cart Management endpoints (storefront customer authenticated)
  const cartRouter = createCartRouter(env);
  app.use("/api/cart", cartRouter);
  app.use("/api/v1/cart", cartRouter);

  // Email Notification & Management endpoints (Admin, Customer Preferences, Webhooks)
  const emailRouter = createEmailRouter(env);
  app.use("/api/emails", emailRouter);
  app.use("/api/v1/emails", emailRouter);

  // Newsletter Subscriber endpoints (storefront public & admin protected)
  const newsletterRouter = createNewsletterRouter(env);
  app.use("/api/newsletter", newsletterRouter);
  app.use("/api/v1/newsletter", newsletterRouter);

  // FAQ endpoints (storefront public & admin protected)
  const faqRouter = createFaqRouter(env);
  app.use("/api/faqs", faqRouter);
  app.use("/api/v1/faqs", faqRouter);

  // API v1 namespace
  app.use("/api/v1", v1Router);

  // ── 404 Handler ───────────────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Centralized Error Handler (must be registered last) ────────────────────
  app.use(errorHandler);

  return app;
}
