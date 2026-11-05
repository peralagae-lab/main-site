import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

export type ContactStatus = "non-contact" | "contact";

export interface CreateContactEnquiryInput {
  name: string;
  email: string;
  phone?: string | null | undefined;
  message: string;
}

export interface ContactEnquiryCounts {
  newContacts: number; // status === "non-contact"
  contacted: number;   // status === "contact"
  total: number;
}

export interface GetContactEnquiriesOptions {
  status?: ContactStatus | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class ContactEnquiryService {
  /**
   * Creates a new customer contact enquiry.
   * Status automatically defaults to "non-contact".
   */
  static async createEnquiry(input: CreateContactEnquiryInput) {
    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = input.phone ? input.phone.trim() : null;
    const cleanMessage = input.message.trim();

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        message: cleanMessage,
        status: "non-contact",
      },
    });

    logger.info(
      { enquiryId: enquiry.id, email: enquiry.email },
      "[ContactEnquiryService] New customer contact enquiry received"
    );

    return enquiry;
  }

  /**
   * Retrieves enquiries optionally filtered by status ("non-contact" or "contact").
   * Results are sorted newest-first.
   */
  static async getEnquiries(options: GetContactEnquiriesOptions = {}) {
    const { status, page = 1, limit = 50 } = options;
    const skip = (Math.max(1, page) - 1) * limit;

    const whereClause: { status?: string } = {};
    if (status && (status === "non-contact" || status === "contact")) {
      whereClause.status = status;
    }

    const [enquiries, total, counts] = await Promise.all([
      prisma.contactEnquiry.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contactEnquiry.count({ where: whereClause }),
      this.getCounts(),
    ]);

    return {
      enquiries,
      total,
      page,
      limit,
      counts,
    };
  }

  /**
   * Calculates exact live counts from production database records.
   */
  static async getCounts(): Promise<ContactEnquiryCounts> {
    const [newContacts, contacted] = await Promise.all([
      prisma.contactEnquiry.count({ where: { status: "non-contact" } }),
      prisma.contactEnquiry.count({ where: { status: "contact" } }),
    ]);

    return {
      newContacts,
      contacted,
      total: newContacts + contacted,
    };
  }

  /**
   * Updates an enquiry status.
   * Strictly permits only "non-contact" and "contact".
   */
  static async updateStatus(id: string, status: ContactStatus) {
    if (status !== "non-contact" && status !== "contact") {
      throw new Error("Invalid status. Allowed values are 'non-contact' or 'contact'");
    }

    const updated = await prisma.contactEnquiry.update({
      where: { id },
      data: { status },
    });

    logger.info(
      { enquiryId: id, newStatus: status },
      "[ContactEnquiryService] Enquiry status updated"
    );

    return updated;
  }
}

