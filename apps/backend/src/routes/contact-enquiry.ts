import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { EnvConfig } from "../config/env.js";
import { createAdminAuthMiddleware } from "../middleware/admin-auth.js";
import { ContactEnquiryService, type ContactStatus } from "../services/contact-enquiry-service.js";
import { StoreDetailsService } from "../services/store-details-service.js";
import { logger } from "../utils/logger.js";

const createContactSchema = z.object({
  name: z.string().optional(),
  fullName: z.string().optional(),
  email: z
    .string({ required_error: "Email address is required" })
    .trim()
    .email("Please enter a valid email address")
    .max(120, "Email cannot exceed 120 characters"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .optional()
    .nullable(),
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(5, "Message must be at least 5 characters")
    .max(3000, "Message cannot exceed 3000 characters"),
});

const updateStatusSchema = z.object({
  status: z.enum(["non-contact", "contact"], {
    errorMap: () => ({ message: "Status must be either 'non-contact' or 'contact'" }),
  }),
});

export function createContactEnquiryRouter(env: EnvConfig): Router {
  const router = Router();
  const requireAdminAuth = createAdminAuthMiddleware(env);

  // ── Public Storefront: Submit New Contact Enquiry ─────────────────────────

  /**
   * POST /api/v1/contact
   * Saves customer contact enquiries directly into the production database.
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const parsed = createContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Invalid input data",
            details: parsed.error.errors,
          },
        });
      }

      const rawName = (parsed.data.name || parsed.data.fullName || "").trim();
      if (!rawName || rawName.length < 2) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Full name is required and must be at least 2 characters",
          },
        });
      }

      const enquiry = await ContactEnquiryService.createEnquiry({
        name: rawName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
      });

      return res.status(201).json({
        success: true,
        message: "Thank you for contacting us. Our jewellery concierge team will respond shortly.",
        data: enquiry,
      });
    } catch (err) {
      logger.error({ err }, "[ContactEnquiryRouter] Failed to create enquiry");
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to submit your enquiry at this time. Please try again.",
        },
      });
    }
  });

  // ── Admin Protected: Get Counts ───────────────────────────────────────────

  /**
   * GET /api/v1/contact/counts
   * Returns exact database counts for 'non-contact' and 'contact' enquiries.
   */
  router.get("/counts", requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const counts = await ContactEnquiryService.getCounts();
      return res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (err) {
      logger.error({ err }, "[ContactEnquiryRouter] Failed to retrieve enquiry counts");
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch enquiry counts",
        },
      });
    }
  });

  // ── Admin Protected: Update Status ────────────────────────────────────────

  /**
   * PATCH /api/v1/contact/:id/status
   * Updates enquiry status to 'non-contact' or 'contact'.
   */
  router.patch("/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = typeof req.params["id"] === "string" ? req.params["id"] : "";
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Enquiry ID is required" },
        });
      }

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Invalid status",
          },
        });
      }

      const updated = await ContactEnquiryService.updateStatus(
        id,
        parsed.data.status as ContactStatus
      );

      const counts = await ContactEnquiryService.getCounts();

      return res.status(200).json({
        success: true,
        data: updated,
        counts,
      });
    } catch (err) {
      logger.error({ err, enquiryId: req.params["id"] }, "[ContactEnquiryRouter] Failed to update status");
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update enquiry status",
        },
      });
    }
  });

  // ── Query Enquiries with Store Details Fallback for Alias Compatibility ───

  /**
   * GET /api/v1/contact
   * - If query has 'status', 'enquiries' or admin authorization header: returns filtered enquiries and counts.
   * - If completely unauthenticated with no enquiry query: returns store details (legacy alias backward compatibility).
   */
  router.get("/", async (req: Request, res: Response, next) => {
    const isEnquiryRequest =
      Boolean(req.query["status"]) ||
      req.query["enquiries"] === "true" ||
      Boolean(req.headers.authorization);

    if (!isEnquiryRequest) {
      // Legacy alias compatibility: return store details
      try {
        const details = await StoreDetailsService.getStoreDetails();
        return res.status(200).json({
          success: true,
          data: details,
        });
      } catch (err) {
        return next(err);
      }
    }

    // Enquiry listing: strictly enforce admin authentication
    return requireAdminAuth(req, res, async () => {
      try {
        const rawStatus = req.query["status"] as string | undefined;
        let statusFilter: ContactStatus | undefined;
        if (rawStatus === "non-contact" || rawStatus === "contact") {
          statusFilter = rawStatus;
        }

        const page = parseInt((req.query["page"] as string) || "1", 10);
        const limit = parseInt((req.query["limit"] as string) || "50", 10);

        const result = await ContactEnquiryService.getEnquiries({
          status: statusFilter,
          page: isNaN(page) ? 1 : page,
          limit: isNaN(limit) ? 50 : limit,
        });

        return res.status(200).json({
          success: true,
          data: result.enquiries,
          counts: result.counts,
          total: result.total,
          page: result.page,
          limit: result.limit,
        });
      } catch (err) {
        logger.error({ err }, "[ContactEnquiryRouter] Failed to fetch enquiries");
        return res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch enquiries",
          },
        });
      }
    });
  });

  return router;
}
