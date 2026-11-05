import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const BASELINE_FAQS = [
  {
    question: "Are all PERALAGAE jewellery pieces authentic and hallmarked?",
    answer:
      "Yes. Every piece of PERALAGAE jewellery is crafted in solid 18k or 22k gold and bears authentic BIS Hallmarking with unique HUID laser engraving. All natural diamond and precious gemstone pieces include individual authenticity certificates from internationally recognised gemological laboratories (IGI / SGL).",
    order: 1,
    isActive: true,
  },
  {
    question: "Can I request custom jewellery engravings or bespoke designs?",
    answer:
      "Absolutely. We offer complimentary custom laser engravings on eligible rings, bangles, and pendants. For bespoke commissions, our master artisans collaborate directly with you to craft unique, tailored heirlooms.",
    order: 2,
    isActive: true,
  },
  {
    question: "How is my order shipped, and is delivery insured?",
    answer:
      "All PERALAGAE shipments are dispatched via specialized secure, tamper-evident courier partners and are 100% insured against loss or damage until the moment they are safely handed over with OTP verification upon delivery.",
    order: 3,
    isActive: true,
  },
  {
    question: "What is PERALAGAE's return and exchange policy?",
    answer:
      "We provide a 15-day complimentary exchange and return window for unworn items in their original luxury packaging with seals and gemological certificates intact. Custom-crafted and bespoke engraved pieces are non-refundable.",
    order: 4,
    isActive: true,
  },
  {
    question: "How should I care for and maintain my gold and diamond jewellery?",
    answer:
      "Store each piece inside the complimentary PERALAGAE anti-tarnish suede pouch. Avoid contact with perfumes, lotions, and chlorine. Gently clean using a soft lint-free cloth. We also provide lifetime complimentary cleaning across our boutique partners.",
    order: 5,
    isActive: true,
  },
];

export class FaqService {
  /**
   * Automatically initializes baseline FAQs in MongoDB if none exist.
   */
  static async seedInitialData(): Promise<void> {
    try {
      const count = await prisma.faq.count();
      if (count === 0) {
        logger.info("Initializing baseline FAQs in MongoDB...");
        for (const faq of BASELINE_FAQS) {
          await prisma.faq.create({
            data: faq,
          });
        }
        logger.info({ count: BASELINE_FAQS.length }, "Baseline FAQs initialized in MongoDB");
      }
    } catch (err) {
      logger.warn({ err }, "Could not complete FAQ initialization in MongoDB");
    }
  }

  /**
   * Retrieves active FAQs for storefront display, strictly capped at a maximum of 5.
   * If fewer than 5 exist, only returns available active records.
   * If none exist, returns an empty array.
   */
  static async getActiveFaqs(limit = 5): Promise<FaqItem[]> {
    const safeLimit = Math.min(5, Math.max(1, limit));
    const records = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      take: safeLimit,
    });

    return records.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      order: r.order,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves all FAQs for admin dashboard management.
   */
  static async getAllAdminFaqs(): Promise<FaqItem[]> {
    const records = await prisma.faq.findMany({
      orderBy: { order: "asc" },
    });

    return records.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      order: r.order,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  /**
   * Creates a new FAQ entry.
   */
  static async createFaq(data: {
    question: string;
    answer: string;
    order?: number | undefined;
    isActive?: boolean | undefined;
  }): Promise<FaqItem> {
    const order = typeof data.order === "number" ? data.order : (await prisma.faq.count()) + 1;
    const record = await prisma.faq.create({
      data: {
        question: data.question.trim(),
        answer: data.answer.trim(),
        order,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });

    return {
      id: record.id,
      question: record.question,
      answer: record.answer,
      order: record.order,
      isActive: record.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing FAQ entry.
   */
  static async updateFaq(
    id: string,
    data: {
      question?: string | undefined;
      answer?: string | undefined;
      order?: number | undefined;
      isActive?: boolean | undefined;
    }
  ): Promise<FaqItem> {
    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`FAQ with ID "${id}" not found`);
    }

    const dataToUpdate: any = {};
    if (data.question !== undefined) dataToUpdate.question = data.question.trim();
    if (data.answer !== undefined) dataToUpdate.answer = data.answer.trim();
    if (data.order !== undefined) dataToUpdate.order = Number(data.order);
    if (data.isActive !== undefined) dataToUpdate.isActive = Boolean(data.isActive);

    const record = await prisma.faq.update({
      where: { id },
      data: dataToUpdate,
    });

    return {
      id: record.id,
      question: record.question,
      answer: record.answer,
      order: record.order,
      isActive: record.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes an FAQ entry.
   */
  static async deleteFaq(id: string): Promise<{ success: boolean; id: string }> {
    await prisma.faq.delete({ where: { id } });
    return { success: true, id };
  }
}
