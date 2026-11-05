import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { EnvConfig } from "../config/env.js";
import { createAdminAuthMiddleware } from "../middleware/admin-auth.js";
import { NewsletterSubscriberService } from "../services/newsletter-subscriber-service.js";

const subscribeSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  source: z.string().trim().optional().default("POPUP"),
});

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export function createNewsletterRouter(env: EnvConfig): Router {
  const router = Router();
  const requireAdminAuth = createAdminAuthMiddleware(env);

  /**
   * POST /subscribe
   * Public endpoint to subscribe to newsletter.
   */
  router.post("/subscribe", async (req: Request, res: Response) => {
    const parseResult = subscribeSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Invalid email address",
        },
      });
      return;
    }

    try {
      const result = await NewsletterSubscriberService.subscribe(
        parseResult.data.email,
        parseResult.data.source
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: { isNew: result.isNew },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record subscription";
      res.status(500).json({
        success: false,
        error: {
          code: "SUBSCRIPTION_FAILED",
          message,
        },
      });
    }
  });

  /**
   * GET /admin/subscribers
   * Protected endpoint for admin portal to list all subscribers.
   */
  router.get("/admin/subscribers", requireAdminAuth, async (req: Request, res: Response) => {
    const page = parseInt(req.query["page"] as string, 10) || 1;
    const limit = parseInt(req.query["limit"] as string, 10) || 20;
    const search = (req.query["search"] as string) || "";
    const status = (req.query["status"] as string) || "ALL";

    try {
      const result = await NewsletterSubscriberService.getSubscribers({
        page,
        limit,
        search,
        status,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load subscribers";
      res.status(500).json({
        success: false,
        error: {
          code: "FETCH_SUBSCRIBERS_FAILED",
          message,
        },
      });
    }
  });

  /**
   * DELETE /admin/subscribers/:id
   * Protected endpoint to delete a subscriber.
   */
  router.delete("/admin/subscribers/:id", requireAdminAuth, async (req: Request, res: Response) => {
    const rawId = req.params["id"];
    const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

    if (!id) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Subscriber ID is required" },
      });
      return;
    }

    try {
      await NewsletterSubscriberService.deleteSubscriber(id);

      res.status(200).json({
        success: true,
        message: "Subscriber removed successfully.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete subscriber";
      res.status(500).json({
        success: false,
        error: {
          code: "DELETE_SUBSCRIBER_FAILED",
          message,
        },
      });
    }
  });

  /**
   * PATCH /admin/subscribers/:id/status
   * Protected endpoint to toggle subscriber active/inactive status.
   */
  router.patch("/admin/subscribers/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    const rawId = req.params["id"];
    const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
    const parseResult = updateStatusSchema.safeParse(req.body);

    if (!id || !parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid parameters" },
      });
      return;
    }

    try {
      await NewsletterSubscriberService.toggleStatus(id, parseResult.data.isActive);

      res.status(200).json({
        success: true,
        message: "Subscriber status updated.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update subscriber status";
      res.status(500).json({
        success: false,
        error: {
          code: "UPDATE_STATUS_FAILED",
          message,
        },
      });
    }
  });

  return router;
}
