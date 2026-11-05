import crypto from "node:crypto";
import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

export interface TopBarSettings {
  text: string;
  backgroundColor: string;
  textColor: string;
  visible: boolean;
  dismissible: boolean;
}

export interface TopBarUpdateInput {
  text?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  visible?: boolean | undefined;
  dismissible?: boolean | undefined;
}

export interface SecondNavbarLink {
  id: string;
  label: string;
  href: string;
  isImplemented: boolean;
}

export interface SecondNavbarSettings {
  phone: string;
  phoneHref: string;
  promoText: string;
  ctaText: string;
  ctaHref: string;
  links: SecondNavbarLink[];
  showPhone: boolean;
  showPromotion: boolean;
  showLinks: boolean;
}

export interface SecondNavbarUpdateInput {
  promoText?: string | undefined;
  // Preserved for backward-compatibility; updateSecondNavbar will update only promoText
  phone?: string | undefined;
  phoneHref?: string | undefined;
  ctaText?: string | undefined;
  ctaHref?: string | undefined;
  links?: SecondNavbarLink[] | undefined;
  showPhone?: boolean | undefined;
  showPromotion?: boolean | undefined;
  showLinks?: boolean | undefined;
}

export interface NavbarSettings {
  id: string;
  topBar: TopBarSettings;
  secondNavbar: SecondNavbarSettings;
  version: number;
  topBarVersion: number;
  secondNavbarVersion: number;
  updatedAt: string;
  updatedBy: string;
}

export interface NavbarHistoryRecord {
  id: string;
  section: "TOP_BAR" | "SECOND_NAVBAR" | "top_bar" | "second_navbar" | "full";
  snapshot: NavbarSettings;
  description: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

export const defaultTopBarSettings: TopBarSettings = {
  text: "",
  backgroundColor: "#FBC0CE",
  textColor: "#222222",
  visible: true,
  dismissible: true,
};

export const defaultSecondNavbarSettings: SecondNavbarSettings = {
  phone: "+91 98765 43210",
  phoneHref: "tel:+919876543210",
  promoText: "",
  ctaText: "Shop Now!",
  ctaHref: "/shop",
  links: [
    {
      id: "find-store",
      label: "Find a Store",
      href: "/#store-locator",
      isImplemented: true,
    },
    {
      id: "faqs",
      label: "FAQs",
      href: "/#faqs",
      isImplemented: false,
    },
    {
      id: "subscribe",
      label: "Subscribe",
      href: "/#newsletter-section",
      isImplemented: true,
    },
  ],
  showPhone: true,
  showPromotion: true,
  showLinks: true,
};

export function getDefaultNavbarSettings(): NavbarSettings {
  return {
    id: "current",
    topBar: { ...defaultTopBarSettings },
    secondNavbar: {
      ...defaultSecondNavbarSettings,
      links: defaultSecondNavbarSettings.links.map((l) => ({ ...l })),
    },
    version: 1,
    topBarVersion: 1,
    secondNavbarVersion: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
}

// Global in-memory storage fallback for offline / disconnected DB state
let memorySettings: NavbarSettings = getDefaultNavbarSettings();

let memoryTopBarHistory: NavbarHistoryRecord[] = [
  {
    id: "hist_init_top_bar",
    section: "TOP_BAR",
    snapshot: getDefaultNavbarSettings(),
    description: "Initial baseline published Top Bar configuration",
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: "system",
  },
];

let memorySecondNavbarHistory: NavbarHistoryRecord[] = [
  {
    id: "hist_init_second_navbar",
    section: "SECOND_NAVBAR",
    snapshot: getDefaultNavbarSettings(),
    description: "Initial baseline published Second Navbar promotional message",
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: "system",
  },
];

let dbCooldownUntil = 0;

async function tryPrisma<T>(fn: () => Promise<T>): Promise<T | null> {
  if (Date.now() < dbCooldownUntil) {
    return null;
  }
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database operation timed out")), 10000)
      ),
    ]);
    return result;
  } catch (err) {
    dbCooldownUntil = Date.now() + 15000;
    logger.warn({ err }, "Database query failed or timed out; activated fallback cooldown");
    return null;
  }
}

// Section-level concurrency serialization locks
let topBarLock: Promise<void> = Promise.resolve();
let secondNavbarLock: Promise<void> = Promise.resolve();

function runWithLock<T>(
  getLock: () => Promise<void>,
  setLock: (p: Promise<void>) => void,
  task: () => Promise<T>
): Promise<T> {
  const currentLock = getLock();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  setLock(currentLock.then(() => nextLock, () => nextLock));
  return currentLock.then(task).finally(() => release());
}

async function getLatestTopBarVersion(): Promise<number> {
  const record = await tryPrisma(() =>
    prisma.navbarHistory.findFirst({
      where: {
        section: { in: ["TOP_BAR", "top_bar"] },
      },
      orderBy: { version: "desc" },
    })
  );
  if (record) {
    return record.version;
  }
  const memLatest = memoryTopBarHistory.reduce((max, h) => Math.max(max, h.version), 0);
  return memLatest > 0 ? memLatest : (memorySettings.topBarVersion ?? 1);
}

async function getLatestSecondNavbarVersion(): Promise<number> {
  const record = await tryPrisma(() =>
    prisma.navbarHistory.findFirst({
      where: {
        section: { in: ["SECOND_NAVBAR", "second_navbar"] },
      },
      orderBy: { version: "desc" },
    })
  );
  if (record) {
    return record.version;
  }
  const memLatest = memorySecondNavbarHistory.reduce((max, h) => Math.max(max, h.version), 0);
  return memLatest > 0 ? memLatest : (memorySettings.secondNavbarVersion ?? 1);
}

export class NavbarService {
  /**
   * Resets cooldown and in-memory test state.
   */
  static resetCooldown(): void {
    dbCooldownUntil = 0;
  }

  static async resetInMemoryState(): Promise<void> {
    dbCooldownUntil = 0;
    memorySettings = getDefaultNavbarSettings();
    memoryTopBarHistory = [
      {
        id: "hist_init_top_bar",
        section: "TOP_BAR",
        snapshot: getDefaultNavbarSettings(),
        description: "Initial baseline published Top Bar configuration",
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: "system",
      },
    ];
    memorySecondNavbarHistory = [
      {
        id: "hist_init_second_navbar",
        section: "SECOND_NAVBAR",
        snapshot: getDefaultNavbarSettings(),
        description: "Initial baseline published Second Navbar promotional message",
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: "system",
      },
    ];

    // Only reset database if explicitly allowed via ALLOW_DATABASE_RESET environment variable
    if (process.env["ALLOW_DATABASE_RESET"] === "true") {
      try {
        const def = getDefaultNavbarSettings();
        await prisma.navbarSetting.upsert({
          where: { id: "current" },
          create: {
            id: "current",
            topBarText: def.topBar.text,
            topBarBgColor: def.topBar.backgroundColor,
            topBarTextColor: def.topBar.textColor,
            topBarVisible: def.topBar.visible,
            topBarDismissible: def.topBar.dismissible,
            secondPhone: def.secondNavbar.phone,
            secondPhoneHref: def.secondNavbar.phoneHref,
            secondPromoText: def.secondNavbar.promoText,
            secondCtaText: def.secondNavbar.ctaText,
            secondCtaHref: def.secondNavbar.ctaHref,
            secondLinks: def.secondNavbar.links as unknown as object,
            secondPhoneVisible: def.secondNavbar.showPhone,
            secondPromoVisible: def.secondNavbar.showPromotion,
            secondLinksVisible: def.secondNavbar.showLinks,
            version: 1,
            topBarVersion: 1,
            secondNavbarVersion: 1,
            updatedBy: "system",
          },
          update: {
            topBarText: def.topBar.text,
            topBarBgColor: def.topBar.backgroundColor,
            topBarTextColor: def.topBar.textColor,
            topBarVisible: def.topBar.visible,
            topBarDismissible: def.topBar.dismissible,
            secondPhone: def.secondNavbar.phone,
            secondPhoneHref: def.secondNavbar.phoneHref,
            secondPromoText: def.secondNavbar.promoText,
            secondCtaText: def.secondNavbar.ctaText,
            secondCtaHref: def.secondNavbar.ctaHref,
            secondLinks: def.secondNavbar.links as unknown as object,
            secondPhoneVisible: def.secondNavbar.showPhone,
            secondPromoVisible: def.secondNavbar.showPromotion,
            secondLinksVisible: def.secondNavbar.showLinks,
            version: 1,
            topBarVersion: 1,
            secondNavbarVersion: 1,
            updatedBy: "system",
          },
        });
      } catch {
        // In-memory fallback
      }
    }
  }

  /**
   * Retrieves current active Navbar settings with independent section versions.
   */
  static async getSettings(): Promise<NavbarSettings> {
    try {
      let record = await prisma.navbarSetting.findUnique({
        where: { id: "current" },
      });

      if (!record) {
        const def = getDefaultNavbarSettings();
        record = await prisma.navbarSetting.create({
          data: {
            id: "current",
            topBarText: def.topBar.text,
            topBarBgColor: def.topBar.backgroundColor,
            topBarTextColor: def.topBar.textColor,
            topBarVisible: def.topBar.visible,
            topBarDismissible: def.topBar.dismissible,
            secondPhone: def.secondNavbar.phone,
            secondPhoneHref: def.secondNavbar.phoneHref,
            secondPromoText: def.secondNavbar.promoText,
            secondCtaText: def.secondNavbar.ctaText,
            secondCtaHref: def.secondNavbar.ctaHref,
            secondLinks: def.secondNavbar.links as unknown as object,
            secondPhoneVisible: def.secondNavbar.showPhone,
            secondPromoVisible: def.secondNavbar.showPromotion,
            secondLinksVisible: def.secondNavbar.showLinks,
            version: 1,
            topBarVersion: 1,
            secondNavbarVersion: 1,
            updatedBy: "system",
          },
        });

        // Seed initial history records if empty
        const histCount = await prisma.navbarHistory.count();
        if (histCount === 0) {
          await prisma.navbarHistory.createMany({
            data: [
              {
                id: "hist_init_top_bar",
                section: "TOP_BAR",
                snapshot: def as unknown as object,
                description: "Initial baseline published Top Bar configuration",
                version: 1,
                createdBy: "system",
              },
              {
                id: "hist_init_second_navbar",
                section: "SECOND_NAVBAR",
                snapshot: def as unknown as object,
                description: "Initial baseline published Second Navbar promotional message",
                version: 1,
                createdBy: "system",
              },
            ],
          });
        }
      }

      const topVer = await getLatestTopBarVersion();
      const secondVer = await getLatestSecondNavbarVersion();

      const parsedLinks: SecondNavbarLink[] = Array.isArray(record.secondLinks)
        ? (record.secondLinks as unknown as SecondNavbarLink[])
        : defaultSecondNavbarSettings.links;

      const result: NavbarSettings = {
        id: record.id,
        topBar: {
          text: record.topBarText,
          backgroundColor: record.topBarBgColor,
          textColor: record.topBarTextColor,
          visible: record.topBarVisible,
          dismissible: record.topBarDismissible,
        },
        secondNavbar: {
          phone: record.secondPhone,
          phoneHref: record.secondPhoneHref,
          promoText: record.secondPromoText,
          ctaText: record.secondCtaText,
          ctaHref: record.secondCtaHref,
          links: parsedLinks,
          showPhone: record.secondPhoneVisible,
          showPromotion: record.secondPromoVisible,
          showLinks: record.secondLinksVisible,
        },
        version: Math.max(record.version, topVer, secondVer),
        topBarVersion: topVer,
        secondNavbarVersion: secondVer,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy || "admin",
      };

      memorySettings = result;
      return result;
    } catch (err) {
      logger.error({ err }, "Database fetch failed for navbar settings");
      if (process.env["NODE_ENV"] === "test" && memorySettings) {
        logger.warn("Serving cached in-memory navbar settings snapshot in test mode");
        return memorySettings;
      }
      throw err;
    }
  }

  /**
   * Updates Top Bar settings, snapshots to Top Bar history only, and publishes the new version.
   * Concurrency-safe: serialized via lock and atomic transaction.
   */
  static async updateTopBar(
    updates: TopBarUpdateInput,
    adminEmail = "admin@peralagae.com",
    customDescription?: string
  ): Promise<NavbarSettings> {
    return runWithLock(() => topBarLock, (p) => { topBarLock = p; }, async () => {
      const current = await this.getSettings();
      const currentTopBarVersion = await getLatestTopBarVersion();
      const newTopBarVersion = currentTopBarVersion + 1;

      const newTopBar: TopBarSettings = {
        ...current.topBar,
        text: updates.text !== undefined ? updates.text.trim() : current.topBar.text,
        backgroundColor: updates.backgroundColor !== undefined ? updates.backgroundColor : current.topBar.backgroundColor,
        textColor: updates.textColor !== undefined ? updates.textColor : current.topBar.textColor,
        visible: updates.visible !== undefined ? updates.visible : current.topBar.visible,
        dismissible: updates.dismissible !== undefined ? updates.dismissible : current.topBar.dismissible,
      };

      const newSettings: NavbarSettings = {
        ...current,
        topBar: newTopBar,
        topBarVersion: newTopBarVersion,
        version: Math.max(newTopBarVersion, current.secondNavbarVersion),
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail,
      };

      const snapshotToSave: NavbarSettings = JSON.parse(JSON.stringify(newSettings));
      const historyId = `hist_tb_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const desc = customDescription || `Updated Top Bar announcement: "${newTopBar.text.slice(0, 40)}${newTopBar.text.length > 40 ? "..." : ""}"`;

      await prisma.$transaction([
        prisma.navbarHistory.create({
          data: {
            id: historyId,
            section: "TOP_BAR",
            snapshot: snapshotToSave as unknown as object,
            description: desc,
            version: newTopBarVersion,
            createdBy: adminEmail,
          },
        }),
        prisma.navbarSetting.upsert({
          where: { id: "current" },
          create: {
            id: "current",
            topBarText: newTopBar.text,
            topBarBgColor: newTopBar.backgroundColor,
            topBarTextColor: newTopBar.textColor,
            topBarVisible: newTopBar.visible,
            topBarDismissible: newTopBar.dismissible,
            secondPhone: current.secondNavbar.phone,
            secondPhoneHref: current.secondNavbar.phoneHref,
            secondPromoText: current.secondNavbar.promoText,
            secondCtaText: current.secondNavbar.ctaText,
            secondCtaHref: current.secondNavbar.ctaHref,
            secondLinks: current.secondNavbar.links as unknown as object,
            secondPhoneVisible: current.secondNavbar.showPhone,
            secondPromoVisible: current.secondNavbar.showPromotion,
            secondLinksVisible: current.secondNavbar.showLinks,
            version: Math.max(newTopBarVersion, current.secondNavbarVersion),
            topBarVersion: newTopBarVersion,
            secondNavbarVersion: current.secondNavbarVersion,
            updatedBy: adminEmail,
          },
          update: {
            topBarText: newTopBar.text,
            topBarBgColor: newTopBar.backgroundColor,
            topBarTextColor: newTopBar.textColor,
            topBarVisible: newTopBar.visible,
            topBarDismissible: newTopBar.dismissible,
            version: Math.max(newTopBarVersion, current.secondNavbarVersion),
            topBarVersion: newTopBarVersion,
            updatedBy: adminEmail,
          },
        }),
      ]);

      // Update in-memory Top Bar history only
      const newRecord: NavbarHistoryRecord = {
        id: historyId,
        section: "TOP_BAR",
        snapshot: snapshotToSave,
        description: desc,
        version: newTopBarVersion,
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
      };
      memoryTopBarHistory.unshift(newRecord);
      if (memoryTopBarHistory.length > 100) {
        memoryTopBarHistory = memoryTopBarHistory.slice(0, 100);
      }

      memorySettings = newSettings;
      return newSettings;
    });
  }

  /**
   * Updates Second Navbar promotional message ONLY.
   * All other Second Navbar values (phone, CTA, links, visibility) remain strictly unchanged.
   * Snapshots to Second Navbar history only with independent version counter.
   */
  static async updateSecondNavbar(
    updates: SecondNavbarUpdateInput,
    adminEmail = "admin@peralagae.com",
    customDescription?: string
  ): Promise<NavbarSettings> {
    return runWithLock(() => secondNavbarLock, (p) => { secondNavbarLock = p; }, async () => {
      if (!updates.promoText || !updates.promoText.trim()) {
        throw new Error("Promotional message is required");
      }
      const cleanPromo = updates.promoText.trim();
      if (cleanPromo.length > 120) {
        throw new Error("Promotional message must not exceed 120 characters");
      }

      const current = await this.getSettings();
      const currentSecondVersion = await getLatestSecondNavbarVersion();
      const newSecondNavbarVersion = currentSecondVersion + 1;

      // Preserve all other Second Navbar fields exactly as they are
      const newSecondNavbar: SecondNavbarSettings = {
        ...current.secondNavbar,
        promoText: cleanPromo,
      };

      const newSettings: NavbarSettings = {
        ...current,
        secondNavbar: newSecondNavbar,
        secondNavbarVersion: newSecondNavbarVersion,
        version: Math.max(current.topBarVersion, newSecondNavbarVersion),
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail,
      };

      const snapshotToSave: NavbarSettings = JSON.parse(JSON.stringify(newSettings));
      const historyId = `hist_sn_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const desc = customDescription || `Updated promotional message: "${cleanPromo.slice(0, 40)}${cleanPromo.length > 40 ? "..." : ""}"`;

      await prisma.$transaction([
        prisma.navbarHistory.create({
          data: {
            id: historyId,
            section: "SECOND_NAVBAR",
            snapshot: snapshotToSave as unknown as object,
            description: desc,
            version: newSecondNavbarVersion,
            createdBy: adminEmail,
          },
        }),
        prisma.navbarSetting.upsert({
          where: { id: "current" },
          create: {
            id: "current",
            topBarText: current.topBar.text,
            topBarBgColor: current.topBar.backgroundColor,
            topBarTextColor: current.topBar.textColor,
            topBarVisible: current.topBar.visible,
            topBarDismissible: current.topBar.dismissible,
            secondPhone: current.secondNavbar.phone,
            secondPhoneHref: current.secondNavbar.phoneHref,
            secondPromoText: cleanPromo,
            secondCtaText: current.secondNavbar.ctaText,
            secondCtaHref: current.secondNavbar.ctaHref,
            secondLinks: current.secondNavbar.links as unknown as object,
            secondPhoneVisible: current.secondNavbar.showPhone,
            secondPromoVisible: current.secondNavbar.showPromotion,
            secondLinksVisible: current.secondNavbar.showLinks,
            version: Math.max(current.topBarVersion, newSecondNavbarVersion),
            topBarVersion: current.topBarVersion,
            secondNavbarVersion: newSecondNavbarVersion,
            updatedBy: adminEmail,
          },
          update: {
            secondPromoText: cleanPromo,
            version: Math.max(current.topBarVersion, newSecondNavbarVersion),
            secondNavbarVersion: newSecondNavbarVersion,
            updatedBy: adminEmail,
          },
        }),
      ]);

      // Update in-memory Second Navbar history only
      const newRecord: NavbarHistoryRecord = {
        id: historyId,
        section: "SECOND_NAVBAR",
        snapshot: snapshotToSave,
        description: desc,
        version: newSecondNavbarVersion,
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
      };
      memorySecondNavbarHistory.unshift(newRecord);
      if (memorySecondNavbarHistory.length > 100) {
        memorySecondNavbarHistory = memorySecondNavbarHistory.slice(0, 100);
      }

      memorySettings = newSettings;
      return newSettings;
    });
  }

  /**
   * Synchronizes contact phone number from store details (footer settings) to the second navbar.
   * Concurrency-safe: serialized via lock and atomic transaction.
   */
  static async syncPhoneFromStoreDetails(
    phone: string,
    phoneHref: string,
    adminEmail = "admin@peralagae.com"
  ): Promise<NavbarSettings> {
    return runWithLock(() => secondNavbarLock, (p) => { secondNavbarLock = p; }, async () => {
      const cleanPhone = phone.trim();
      const cleanHref = phoneHref.trim();

      const current = await this.getSettings();
      const currentSecondVersion = await getLatestSecondNavbarVersion();
      const newSecondNavbarVersion = currentSecondVersion + 1;

      const newSecondNavbar: SecondNavbarSettings = {
        ...current.secondNavbar,
        phone: cleanPhone,
        phoneHref: cleanHref,
      };

      const newSettings: NavbarSettings = {
        ...current,
        secondNavbar: newSecondNavbar,
        secondNavbarVersion: newSecondNavbarVersion,
        version: Math.max(current.topBarVersion, newSecondNavbarVersion),
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail,
      };

      const snapshotToSave: NavbarSettings = JSON.parse(JSON.stringify(newSettings));
      const historyId = `hist_sn_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const desc = `Synchronized contact phone number from store details: "${cleanPhone}"`;

      await tryPrisma(() =>
        prisma.$transaction([
          prisma.navbarHistory.create({
            data: {
              id: historyId,
              section: "SECOND_NAVBAR",
              snapshot: snapshotToSave as unknown as object,
              description: desc,
              version: newSecondNavbarVersion,
              createdBy: adminEmail,
            },
          }),
          prisma.navbarSetting.upsert({
            where: { id: "current" },
            create: {
              id: "current",
              topBarText: current.topBar.text,
              topBarBgColor: current.topBar.backgroundColor,
              topBarTextColor: current.topBar.textColor,
              topBarVisible: current.topBar.visible,
              topBarDismissible: current.topBar.dismissible,
              secondPhone: cleanPhone,
              secondPhoneHref: cleanHref,
              secondPromoText: current.secondNavbar.promoText,
              secondCtaText: current.secondNavbar.ctaText,
              secondCtaHref: current.secondNavbar.ctaHref,
              secondLinks: current.secondNavbar.links as unknown as object,
              secondPhoneVisible: current.secondNavbar.showPhone,
              secondPromoVisible: current.secondNavbar.showPromotion,
              secondLinksVisible: current.secondNavbar.showLinks,
              version: Math.max(current.topBarVersion, newSecondNavbarVersion),
              topBarVersion: current.topBarVersion,
              secondNavbarVersion: newSecondNavbarVersion,
              updatedBy: adminEmail,
            },
            update: {
              secondPhone: cleanPhone,
              secondPhoneHref: cleanHref,
              version: Math.max(current.topBarVersion, newSecondNavbarVersion),
              secondNavbarVersion: newSecondNavbarVersion,
              updatedBy: adminEmail,
            },
          }),
        ])
      );

      // Update in-memory Second Navbar history only
      const newRecord: NavbarHistoryRecord = {
        id: historyId,
        section: "SECOND_NAVBAR",
        snapshot: snapshotToSave,
        description: desc,
        version: newSecondNavbarVersion,
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
      };
      memorySecondNavbarHistory.unshift(newRecord);
      if (memorySecondNavbarHistory.length > 100) {
        memorySecondNavbarHistory = memorySecondNavbarHistory.slice(0, 100);
      }

      memorySettings = newSettings;
      return newSettings;
    });
  }

  /**
   * Retrieves historical version snapshots filtered by section.
   * If section is specified ("top_bar" or "second_navbar"), returns only snapshots for that section.
   */
  static async getHistory(section?: string): Promise<NavbarHistoryRecord[]> {
    const normSection = section ? section.toUpperCase().trim() : undefined;
    const isTopBarQuery = normSection === "TOP_BAR" || normSection === "TOP-BAR";
    const isSecondNavbarQuery = normSection === "SECOND_NAVBAR" || normSection === "SECOND-NAVBAR";

    const records = await tryPrisma(async () => {
      if (isTopBarQuery) {
        return prisma.navbarHistory.findMany({
          where: { section: { in: ["TOP_BAR", "top_bar"] } },
          orderBy: { version: "desc" },
          take: 100,
        });
      }
      if (isSecondNavbarQuery) {
        return prisma.navbarHistory.findMany({
          where: { section: { in: ["SECOND_NAVBAR", "second_navbar"] } },
          orderBy: { version: "desc" },
          take: 100,
        });
      }
      return prisma.navbarHistory.findMany({
        orderBy: { version: "desc" },
        take: 100,
      });
    });

    if (records && records.length > 0) {
      return records.map((r) => {
        const snap = r.snapshot as unknown as NavbarSettings;
        const secNorm: "TOP_BAR" | "SECOND_NAVBAR" | "full" =
          r.section.toUpperCase() === "TOP_BAR" ? "TOP_BAR" :
          r.section.toUpperCase() === "SECOND_NAVBAR" ? "SECOND_NAVBAR" : "full";

        return {
          id: r.id,
          section: secNorm,
          snapshot: snap,
          description: r.description || `${r.section} snapshot`,
          version: r.version,
          createdAt: r.createdAt.toISOString(),
          createdBy: r.createdBy || "admin",
        };
      });
    }

    if (isTopBarQuery) {
      return [...memoryTopBarHistory].sort((a, b) => b.version - a.version);
    }
    if (isSecondNavbarQuery) {
      return [...memorySecondNavbarHistory].sort((a, b) => b.version - a.version);
    }

    // Merge and return both if no specific section query
    return [...memoryTopBarHistory, ...memorySecondNavbarHistory].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Restores a previously saved snapshot.
   * Restoring Top Bar affects ONLY Top Bar.
   * Restoring Second Navbar affects ONLY Second Navbar promotional message.
   * Before restoration, snapshots currently published section into history.
   */
  static async restoreHistory(
    historyId: string,
    adminEmail = "admin@peralagae.com",
    targetSection?: "top_bar" | "second_navbar" | "full"
  ): Promise<NavbarSettings> {
    const dbRecord = await prisma.navbarHistory.findUnique({ where: { id: historyId } }).catch(() => null);
    let targetRecord: NavbarHistoryRecord | undefined;
    if (dbRecord) {
      targetRecord = {
        id: dbRecord.id,
        section: dbRecord.section.toUpperCase() === "SECOND_NAVBAR" ? "SECOND_NAVBAR" : "TOP_BAR",
        snapshot: dbRecord.snapshot as unknown as NavbarSettings,
        description: dbRecord.description || "",
        version: dbRecord.version,
        createdAt: dbRecord.createdAt.toISOString(),
        createdBy: dbRecord.createdBy || "admin",
      };
    } else {
      const allHistory = await this.getHistory();
      targetRecord = allHistory.find((h) => h.id === historyId);
    }

    if (!targetRecord) {
      throw new Error(`Version history snapshot '${historyId}' not found`);
    }

    const effectiveSection = targetSection || (
      targetRecord.section.toUpperCase() === "SECOND_NAVBAR" ? "second_navbar" : "top_bar"
    );

    if (effectiveSection === "top_bar") {
      return runWithLock(() => topBarLock, (p) => { topBarLock = p; }, async () => {
        const current = await this.getSettings();
        const currentTopVersion = await getLatestTopBarVersion();

        // 1. Snapshot current live Top Bar before restoring
        const preRestoreVersion = currentTopVersion + 1;
        const preRestoreSnapshot: NavbarSettings = JSON.parse(JSON.stringify(current));
        preRestoreSnapshot.topBarVersion = preRestoreVersion;

        const preHistoryId = `hist_tb_${Date.now()}_pre_${crypto.randomBytes(3).toString("hex")}`;
        const preRecord: NavbarHistoryRecord = {
          id: preHistoryId,
          section: "TOP_BAR",
          snapshot: preRestoreSnapshot,
          description: `Pre-restore backup before restoring Top Bar v${targetRecord.version}`,
          version: preRestoreVersion,
          createdAt: new Date().toISOString(),
          createdBy: adminEmail,
        };
        memoryTopBarHistory.unshift(preRecord);

        // 2. Prepare restored Top Bar settings
        const restoredTopVersion = preRestoreVersion + 1;
        const restoredTopBar: TopBarSettings = {
          ...targetRecord.snapshot.topBar,
        };

        const restoredSettings: NavbarSettings = {
          ...current,
          topBar: restoredTopBar,
          topBarVersion: restoredTopVersion,
          version: Math.max(restoredTopVersion, current.secondNavbarVersion),
          updatedAt: new Date().toISOString(),
          updatedBy: adminEmail,
        };

        const restoreHistoryId = `hist_tb_${Date.now()}_res_${crypto.randomBytes(3).toString("hex")}`;
        const restoreRecord: NavbarHistoryRecord = {
          id: restoreHistoryId,
          section: "TOP_BAR",
          snapshot: JSON.parse(JSON.stringify(restoredSettings)),
          description: `Restored Top Bar from version v${targetRecord.version}`,
          version: restoredTopVersion,
          createdAt: new Date().toISOString(),
          createdBy: adminEmail,
        };
        memoryTopBarHistory.unshift(restoreRecord);

        await prisma.$transaction([
          prisma.navbarHistory.create({
            data: {
              id: preHistoryId,
              section: "TOP_BAR",
              snapshot: preRestoreSnapshot as unknown as object,
              description: preRecord.description,
              version: preRestoreVersion,
              createdBy: adminEmail,
            },
          }),
          prisma.navbarHistory.create({
            data: {
              id: restoreHistoryId,
              section: "TOP_BAR",
              snapshot: restoredSettings as unknown as object,
              description: restoreRecord.description,
              version: restoredTopVersion,
              createdBy: adminEmail,
            },
          }),
          prisma.navbarSetting.upsert({
            where: { id: "current" },
            create: {
              id: "current",
              topBarText: restoredTopBar.text,
              topBarBgColor: restoredTopBar.backgroundColor,
              topBarTextColor: restoredTopBar.textColor,
              topBarVisible: restoredTopBar.visible,
              topBarDismissible: restoredTopBar.dismissible,
              secondPhone: current.secondNavbar.phone,
              secondPhoneHref: current.secondNavbar.phoneHref,
              secondPromoText: current.secondNavbar.promoText,
              secondCtaText: current.secondNavbar.ctaText,
              secondCtaHref: current.secondNavbar.ctaHref,
              secondLinks: current.secondNavbar.links as unknown as object,
              secondPhoneVisible: current.secondNavbar.showPhone,
              secondPromoVisible: current.secondNavbar.showPromotion,
              secondLinksVisible: current.secondNavbar.showLinks,
              version: Math.max(restoredTopVersion, current.secondNavbarVersion),
              topBarVersion: restoredTopVersion,
              secondNavbarVersion: current.secondNavbarVersion,
              updatedBy: adminEmail,
            },
            update: {
              topBarText: restoredTopBar.text,
              topBarBgColor: restoredTopBar.backgroundColor,
              topBarTextColor: restoredTopBar.textColor,
              topBarVisible: restoredTopBar.visible,
              topBarDismissible: restoredTopBar.dismissible,
              version: Math.max(restoredTopVersion, current.secondNavbarVersion),
              topBarVersion: restoredTopVersion,
              updatedBy: adminEmail,
            },
          }),
        ]);

        memorySettings = restoredSettings;
        return restoredSettings;
      });
    } else {
      // Restoring Second Navbar promotional message
      return runWithLock(() => secondNavbarLock, (p) => { secondNavbarLock = p; }, async () => {
        const current = await this.getSettings();
        const currentSecondVersion = await getLatestSecondNavbarVersion();

        // 1. Snapshot current live Second Navbar before restoring
        const preRestoreVersion = currentSecondVersion + 1;
        const preRestoreSnapshot: NavbarSettings = JSON.parse(JSON.stringify(current));
        preRestoreSnapshot.secondNavbarVersion = preRestoreVersion;

        const preHistoryId = `hist_sn_${Date.now()}_pre_${crypto.randomBytes(3).toString("hex")}`;
        const preRecord: NavbarHistoryRecord = {
          id: preHistoryId,
          section: "SECOND_NAVBAR",
          snapshot: preRestoreSnapshot,
          description: `Pre-restore backup before restoring Second Navbar v${targetRecord.version}`,
          version: preRestoreVersion,
          createdAt: new Date().toISOString(),
          createdBy: adminEmail,
        };
        memorySecondNavbarHistory.unshift(preRecord);

        // 2. Prepare restored Second Navbar settings: restore promoText ONLY!
        const restoredSecondVersion = preRestoreVersion + 1;
        const restoredPromoText = targetRecord.snapshot.secondNavbar.promoText;

        const restoredSecondNavbar: SecondNavbarSettings = {
          ...current.secondNavbar,
          promoText: restoredPromoText,
        };

        const restoredSettings: NavbarSettings = {
          ...current,
          secondNavbar: restoredSecondNavbar,
          secondNavbarVersion: restoredSecondVersion,
          version: Math.max(current.topBarVersion, restoredSecondVersion),
          updatedAt: new Date().toISOString(),
          updatedBy: adminEmail,
        };

        const restoreHistoryId = `hist_sn_${Date.now()}_res_${crypto.randomBytes(3).toString("hex")}`;
        const restoreRecord: NavbarHistoryRecord = {
          id: restoreHistoryId,
          section: "SECOND_NAVBAR",
          snapshot: JSON.parse(JSON.stringify(restoredSettings)),
          description: `Restored Second Navbar promotional message from version v${targetRecord.version}`,
          version: restoredSecondVersion,
          createdAt: new Date().toISOString(),
          createdBy: adminEmail,
        };
        memorySecondNavbarHistory.unshift(restoreRecord);

        await prisma.$transaction([
          prisma.navbarHistory.create({
            data: {
              id: preHistoryId,
              section: "SECOND_NAVBAR",
              snapshot: preRestoreSnapshot as unknown as object,
              description: preRecord.description,
              version: preRestoreVersion,
              createdBy: adminEmail,
            },
          }),
          prisma.navbarHistory.create({
            data: {
              id: restoreHistoryId,
              section: "SECOND_NAVBAR",
              snapshot: restoredSettings as unknown as object,
              description: restoreRecord.description,
              version: restoredSecondVersion,
              createdBy: adminEmail,
            },
          }),
          prisma.navbarSetting.upsert({
            where: { id: "current" },
            create: {
              id: "current",
              topBarText: current.topBar.text,
              topBarBgColor: current.topBar.backgroundColor,
              topBarTextColor: current.topBar.textColor,
              topBarVisible: current.topBar.visible,
              topBarDismissible: current.topBar.dismissible,
              secondPhone: current.secondNavbar.phone,
              secondPhoneHref: current.secondNavbar.phoneHref,
              secondPromoText: restoredPromoText,
              secondCtaText: current.secondNavbar.ctaText,
              secondCtaHref: current.secondNavbar.ctaHref,
              secondLinks: current.secondNavbar.links as unknown as object,
              secondPhoneVisible: current.secondNavbar.showPhone,
              secondPromoVisible: current.secondNavbar.showPromotion,
              secondLinksVisible: current.secondNavbar.showLinks,
              version: Math.max(current.topBarVersion, restoredSecondVersion),
              topBarVersion: current.topBarVersion,
              secondNavbarVersion: restoredSecondVersion,
              updatedBy: adminEmail,
            },
            update: {
              secondPromoText: restoredPromoText,
              version: Math.max(current.topBarVersion, restoredSecondVersion),
              secondNavbarVersion: restoredSecondVersion,
              updatedBy: adminEmail,
            },
          }),
        ]);

        memorySettings = restoredSettings;
        return restoredSettings;
      });
    }
  }
}
