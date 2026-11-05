import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";
import { NavbarService } from "./navbar-service.js";

export interface StoreDetailsInput {
  phone: string;
  address: string;
  email: string;
}

export interface StoreDetailsResult {
  id: string;
  phone: string;
  address: string;
  email: string;
  updatedAt: Date;
  updatedBy: string | null;
}

const DEFAULT_STORE_DETAILS = {
  id: "current",
  phone: "123 45678 90",
  address: "502 New Design Str, Melbourne, Australia",
  email: "contact@peralagae.com",
};

export class StoreDetailsService {
  /**
   * Retrieves the current Store Details singleton record.
   * If not found, automatically seeds baseline defaults and returns the record.
   */
  static async getStoreDetails(): Promise<StoreDetailsResult> {
    try {
      const record = await prisma.storeDetails.findUnique({
        where: { id: "current" },
      });

      if (record) {
        return record;
      }

      return await this.seedInitialData();
    } catch (err) {
      logger.error({ err }, "[StoreDetailsService] Failed to fetch store details");
      throw err;
    }
  }

  /**
   * Updates the Store Details singleton record with validated fields.
   */
  static async updateStoreDetails(
    input: StoreDetailsInput,
    updatedBy: string = "admin"
  ): Promise<StoreDetailsResult> {
    try {
      const trimmedPhone = input.phone.trim();
      const trimmedAddress = input.address.trim();
      const trimmedEmail = input.email.trim().toLowerCase();

      const updated = await prisma.storeDetails.upsert({
        where: { id: "current" },
        create: {
          id: "current",
          phone: trimmedPhone,
          address: trimmedAddress,
          email: trimmedEmail,
          updatedBy,
        },
        update: {
          phone: trimmedPhone,
          address: trimmedAddress,
          email: trimmedEmail,
          updatedBy,
        },
      });

      // Synchronize contact phone number with top navbar settings
      const phoneDigits = trimmedPhone.replace(/[^+\d]/g, "");
      const phoneHref = `tel:${phoneDigits || trimmedPhone.replace(/\s+/g, "")}`;
      try {
        await NavbarService.syncPhoneFromStoreDetails(trimmedPhone, phoneHref, updatedBy);
      } catch (navErr) {
        logger.warn({ navErr }, "[StoreDetailsService] Could not sync phone to NavbarService");
      }

      logger.info(
        { phone: updated.phone, email: updated.email, updatedBy },
        "[StoreDetailsService] Store details updated successfully"
      );

      return updated;
    } catch (err) {
      logger.error({ err, input }, "[StoreDetailsService] Failed to update store details");
      throw err;
    }
  }

  /**
   * Initializes baseline Store Details if none exist in the database.
   */
  static async seedInitialData(): Promise<StoreDetailsResult> {
    try {
      const record = await prisma.storeDetails.upsert({
        where: { id: "current" },
        create: {
          id: "current",
          phone: DEFAULT_STORE_DETAILS.phone,
          address: DEFAULT_STORE_DETAILS.address,
          email: DEFAULT_STORE_DETAILS.email,
          updatedBy: "system_seed",
        },
        update: {},
      });

      logger.info("[StoreDetailsService] Initial Store Details baseline ensured");
      return record;
    } catch (err) {
      logger.error({ err }, "[StoreDetailsService] Error ensuring initial store details baseline");
      throw err;
    }
  }
}
