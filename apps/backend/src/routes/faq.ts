import { Router, Request, Response } from "express";
import { FaqService } from "../services/faq-service.js";
import { createAdminAuthMiddleware } from "../middleware/admin-auth.js";
import { logger } from "../utils/logger.js";
import type { EnvConfig } from "../config/env.js";

export function createFaqRouter(env: EnvConfig): Router {
  const router = Router();
  const adminAuth = createAdminAuthMiddleware(env);

  /**
   * GET /api/v1/faqs
   * Public storefront endpoint returning up to 5 active FAQ questions.
   */
  router.get("/", async (_req: Request, res: Response) => {
    try {
      const faqs = await FaqService.getActiveFaqs(5);
      return res.status(200).json({
        success: true,
        data: faqs,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch active FAQs");
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to retrieve FAQs" },
      });
    }
  });

  /**
   * GET /api/v1/faqs/admin
   * Protected endpoint for Admin Dashboard.
   */
  router.get("/admin", adminAuth, async (_req: Request, res: Response) => {
    try {
      const faqs = await FaqService.getAllAdminFaqs();
      return res.status(200).json({
        success: true,
        data: faqs,
      });
    } catch (err) {
      logger.error({ err }, "Failed to fetch admin FAQs");
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to retrieve FAQs" },
      });
    }
  });

  /**
   * POST /api/v1/faqs/admin
   * Create a new FAQ entry.
   */
  router.post("/admin", adminAuth, async (req: Request, res: Response) => {
    try {
      const { question, answer, order, isActive } = req.body;
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Question is required" },
        });
      }
      if (!answer || typeof answer !== "string" || !answer.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Answer is required" },
        });
      }

      const created = await FaqService.createFaq({
        question,
        answer,
        order: typeof order === "number" ? order : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      logger.error({ err }, "Failed to create FAQ");
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create FAQ" },
      });
    }
  });

  /**
   * PUT /api/v1/faqs/admin/:id
   * Update an FAQ entry.
   */
  router.put("/admin/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params["id"];
      if (typeof id !== "string" || !id) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "ID is required" },
        });
      }

      const { question, answer, order, isActive } = req.body;
      const updated = await FaqService.updateFaq(id, {
        question,
        answer,
        order,
        isActive,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      logger.error({ err }, "Failed to update FAQ");
      return res.status(400).json({
        success: false,
        error: { code: "UPDATE_ERROR", message: err.message || "Failed to update FAQ" },
      });
    }
  });

  /**
   * DELETE /api/v1/faqs/admin/:id
   * Delete an FAQ entry.
   */
  router.delete("/admin/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params["id"];
      if (typeof id !== "string" || !id) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "ID is required" },
        });
      }

      await FaqService.deleteFaq(id);
      return res.status(200).json({
        success: true,
        data: { id },
      });
    } catch (err: any) {
      logger.error({ err }, "Failed to delete FAQ");
      return res.status(400).json({
        success: false,
        error: { code: "DELETE_ERROR", message: err.message || "Failed to delete FAQ" },
      });
    }
  });

  return router;
}
