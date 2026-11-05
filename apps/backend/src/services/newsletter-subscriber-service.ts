import crypto from "node:crypto";
import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  isActive: boolean;
  source: string;
}

export interface SubscriberListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface SubscriberListResult {
  subscribers: NewsletterSubscriber[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class NewsletterSubscriberService {
  /**
   * Subscribes an email to the newsletter.
   * If already subscribed, ensures isActive is true.
   */
  static async subscribe(
    rawEmail: string,
    source: string = "POPUP"
  ): Promise<{ success: boolean; message: string; isNew: boolean }> {
    const email = (rawEmail || "").trim().toLowerCase();

    if (!email) {
      throw new Error("Please enter your email address.");
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    try {
      // Find existing subscriber in MongoDB collection
      const findRes = (await prisma.$runCommandRaw({
        find: "newsletter_subscribers",
        filter: { email },
        limit: 1,
      } as any)) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

      const existing = findRes?.cursor?.firstBatch?.[0];

      if (existing) {
        // If already registered, update isActive to true and record source if changed
        await prisma.$runCommandRaw({
          update: "newsletter_subscribers",
          updates: [
            {
              q: { email },
              u: {
                $set: {
                  isActive: true,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          ],
        } as any);

        return {
          success: true,
          message: "Thank you for re-joining the PERALAGAE Circle! You are on the subscriber list.",
          isNew: false,
        };
      }

      // Insert new subscriber record
      const id = crypto.randomUUID();
      const nowIso = new Date().toISOString();

      await prisma.$runCommandRaw({
        insert: "newsletter_subscribers",
        documents: [
          {
            _id: id,
            id,
            email,
            subscribedAt: nowIso,
            isActive: true,
            source: source.toUpperCase(),
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        ],
      } as any);

      logger.info({ email, source }, "[NewsletterSubscriberService] New subscriber added");

      return {
        success: true,
        message: "Thank you for joining the PERALAGAE Circle. Look forward to private previews in your inbox.",
        isNew: true,
      };
    } catch (err: unknown) {
      logger.error({ err, email }, "[NewsletterSubscriberService] Failed to record subscription");
      throw new Error("Subscription could not be saved at this time. Please try again.");
    }
  }

  /**
   * Retrieves all subscribers with search, status filtering, and pagination.
   */
  static async getSubscribers(
    options: SubscriberListOptions = {}
  ): Promise<SubscriberListResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const search = (options.search || "").trim().toLowerCase();
    const status = (options.status || "ALL").toUpperCase();

    try {
      // Build filter object for MongoDB
      const filter: Record<string, unknown> = {};

      if (search) {
        filter["email"] = { $regex: search, $options: "i" };
      }

      if (status === "ACTIVE") {
        filter["isActive"] = true;
      } else if (status === "INACTIVE") {
        filter["isActive"] = false;
      }

      // Fetch all matching subscribers
      const result = (await prisma.$runCommandRaw({
        find: "newsletter_subscribers",
        filter,
        sort: { subscribedAt: -1 },
      } as any)) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

      const allMatches = (result?.cursor?.firstBatch || []).map((doc) => ({
        id: String(doc["_id"] || doc["id"] || ""),
        email: String(doc["email"] || ""),
        subscribedAt: String(doc["subscribedAt"] || doc["createdAt"] || new Date().toISOString()),
        isActive: Boolean(doc["isActive"] ?? true),
        source: String(doc["source"] || "POPUP"),
      }));

      // Calculate stats from full collection
      const statsRes = (await prisma.$runCommandRaw({
        find: "newsletter_subscribers",
        filter: {},
      } as any)) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

      const allDocs = statsRes?.cursor?.firstBatch || [];
      const totalInDb = allDocs.length;
      const activeInDb = allDocs.filter((d) => d["isActive"] !== false).length;
      const inactiveInDb = totalInDb - activeInDb;

      // Slice for pagination
      const total = allMatches.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const offset = (page - 1) * limit;
      const paginated = allMatches.slice(offset, offset + limit);

      return {
        subscribers: paginated,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        stats: {
          total: totalInDb,
          active: activeInDb,
          inactive: inactiveInDb,
        },
      };
    } catch (err: unknown) {
      logger.error({ err }, "[NewsletterSubscriberService] Failed to load subscribers");
      throw new Error("Failed to retrieve subscriber list from database.");
    }
  }

  /**
   * Deletes a subscriber by ID or email.
   */
  static async deleteSubscriber(idOrEmail: string): Promise<boolean> {
    const query = idOrEmail.includes("@")
      ? { email: idOrEmail.trim().toLowerCase() }
      : { _id: idOrEmail };

    try {
      await prisma.$runCommandRaw({
        delete: "newsletter_subscribers",
        deletes: [{ q: query, limit: 1 }],
      } as any);

      logger.info({ idOrEmail }, "[NewsletterSubscriberService] Subscriber deleted");
      return true;
    } catch (err: unknown) {
      logger.error({ err, idOrEmail }, "[NewsletterSubscriberService] Failed to delete subscriber");
      throw new Error("Failed to delete subscriber.");
    }
  }

  /**
   * Toggles a subscriber active status.
   */
  static async toggleStatus(idOrEmail: string, isActive: boolean): Promise<boolean> {
    const query = idOrEmail.includes("@")
      ? { email: idOrEmail.trim().toLowerCase() }
      : { _id: idOrEmail };

    try {
      await prisma.$runCommandRaw({
        update: "newsletter_subscribers",
        updates: [
          {
            q: query,
            u: {
              $set: {
                isActive,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        ],
      } as any);

      logger.info({ idOrEmail, isActive }, "[NewsletterSubscriberService] Subscriber status updated");
      return true;
    } catch (err: unknown) {
      logger.error({ err, idOrEmail }, "[NewsletterSubscriberService] Failed to toggle subscriber status");
      throw new Error("Failed to update subscriber status.");
    }
  }
}
