import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface MaterialWithProductCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
}

export interface MaterialCardInput {
  id?: string | undefined;
  title: string;
  description: string;
  ctaText?: string | undefined;
  imageUrl: string;
  imageAlt?: string | null | undefined;
  materialId?: string | null | undefined;
  order: number;
  isActive: boolean;
}

export interface MaterialSectionUpdateInput {
  heading?: string | undefined;
  cards?: MaterialCardInput[] | undefined;
}

export function productMatchesMaterialRecord(
  p: {
    materialId?: string | null | undefined;
    materialRef?: { id?: string; name?: string; slug?: string } | null | undefined;
    material?: string | null | undefined;
    materials?: any;
  },
  m: { id: string; name: string; slug: string }
): boolean {
  const targetId = m.id.toLowerCase().trim();
  const targetName = m.name.toLowerCase().trim();
  const targetSlug = m.slug.toLowerCase().trim();

  // 1. Direct foreign key materialId reference or materialRef object
  if (p.materialId && p.materialId.toLowerCase().trim() === targetId) {
    return true;
  }
  if (p.materialRef?.id && p.materialRef.id.toLowerCase().trim() === targetId) {
    return true;
  }
  if (p.materialRef?.slug && p.materialRef.slug.toLowerCase().trim() === targetSlug) {
    return true;
  }
  if (p.materialRef?.name && p.materialRef.name.toLowerCase().trim() === targetName) {
    return true;
  }

  // 2. materials JSON array tags
  if (Array.isArray(p.materials)) {
    for (const item of p.materials) {
      if (typeof item === "string") {
        const normalized = item.toLowerCase().trim();
        if (normalized === targetName || normalized === targetSlug) {
          return true;
        }
      }
    }
  }

  // 3. Legacy material text description
  if (typeof p.material === "string" && p.material.trim()) {
    const lower = p.material.toLowerCase().trim();
    if (lower === targetName || lower === targetSlug) {
      return true;
    }
    const words = lower.split(/[\s,&/-]+/);
    if (words.includes(targetName) || words.includes(targetSlug)) {
      return true;
    }
  }

  return false;
}

export class MaterialService {
  /**
   * Returns list of materials from MongoDB with accurate product count
   * calculated using the unified counting rule shared with storefront.
   */
  static async getAllMaterials(options: {
    includeInactive?: boolean | undefined;
    search?: string | undefined;
  } = {}): Promise<MaterialWithProductCount[]> {
    const { includeInactive = true, search } = options;

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    const [materials, allEligibleProducts] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
      prisma.product.findMany({
        where: {
          isAvailable: { not: false },
          inStock: { not: false },
          stockCount: { gt: 0 },
        },
        select: {
          id: true,
          materialId: true,
          material: true,
          materials: true,
        },
      }),
    ]);

    return materials.map((m) => {
      const matchingCount = allEligibleProducts.filter((p) =>
        productMatchesMaterialRecord(p, m)
      ).length;

      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        description: m.description,
        order: m.order,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        productCount: matchingCount,
      };
    });
  }

  /**
   * Get single material by ID.
   */
  static async getMaterialById(id: string): Promise<MaterialWithProductCount | null> {
    const [m, allEligibleProducts] = await Promise.all([
      prisma.material.findUnique({
        where: { id },
      }),
      prisma.product.findMany({
        where: {
          isAvailable: { not: false },
          inStock: { not: false },
          stockCount: { gt: 0 },
        },
        select: {
          id: true,
          materialId: true,
          material: true,
          materials: true,
        },
      }),
    ]);
    if (!m) return null;

    const matchingCount = allEligibleProducts.filter((p) =>
      productMatchesMaterialRecord(p, m)
    ).length;

    return {
      id: m.id,
      name: m.name,
      slug: m.slug,
      description: m.description,
      order: m.order,
      isActive: m.isActive,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      productCount: matchingCount,
    };
  }

  /**
   * Get single material by slug.
   */
  static async getMaterialBySlug(slug: string): Promise<MaterialWithProductCount | null> {
    const [m, allEligibleProducts] = await Promise.all([
      prisma.material.findUnique({
        where: { slug: slug.toLowerCase().trim() },
      }),
      prisma.product.findMany({
        where: {
          isAvailable: { not: false },
          inStock: { not: false },
          stockCount: { gt: 0 },
        },
        select: {
          id: true,
          materialId: true,
          material: true,
          materials: true,
        },
      }),
    ]);
    if (!m) return null;

    const matchingCount = allEligibleProducts.filter((p) =>
      productMatchesMaterialRecord(p, m)
    ).length;

    return {
      id: m.id,
      name: m.name,
      slug: m.slug,
      description: m.description,
      order: m.order,
      isActive: m.isActive,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      productCount: matchingCount,
    };
  }

  /**
   * Creates a new material in MongoDB.
   */
  static async createMaterial(data: {
    name: string;
    slug?: string | undefined;
    description?: string | undefined;
    order?: number | undefined;
    isActive?: boolean | undefined;
  }) {
    const trimmedName = data.name.trim();
    const finalSlug = (data.slug?.trim() || slugify(trimmedName)).toLowerCase();

    // Check unique constraints (case-insensitive)
    const existingName = await prisma.material.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });
    if (existingName) {
      throw new Error(`A material named "${trimmedName}" already exists.`);
    }

    const existingSlug = await prisma.material.findFirst({
      where: {
        slug: {
          equals: finalSlug,
          mode: "insensitive",
        },
      },
    });
    if (existingSlug) {
      throw new Error(`A material with slug "${finalSlug}" already exists.`);
    }

    let order = data.order;
    if (order === undefined) {
      const maxOrder = await prisma.material.aggregate({ _max: { order: true } });
      order = (maxOrder._max.order ?? -1) + 1;
    }

    return await prisma.material.create({
      data: {
        name: trimmedName,
        slug: finalSlug,
        description: data.description?.trim() || null,
        order,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Updates an existing material.
   */
  static async updateMaterial(
    id: string,
    data: {
      name?: string | undefined;
      slug?: string | undefined;
      description?: string | null | undefined;
      order?: number | undefined;
      isActive?: boolean | undefined;
    }
  ) {
    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Material with ID "${id}" was not found.`);
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName !== existing.name) {
        const nameConflict = await prisma.material.findUnique({ where: { name: trimmedName } });
        if (nameConflict && nameConflict.id !== id) {
          throw new Error(`A material named "${trimmedName}" already exists.`);
        }
        updateData.name = trimmedName;

        // Auto-update slug if not explicitly supplied
        if (data.slug === undefined) {
          const autoSlug = slugify(trimmedName);
          const slugConflict = await prisma.material.findUnique({ where: { slug: autoSlug } });
          if (!slugConflict || slugConflict.id === id) {
            updateData.slug = autoSlug;
          }
        }
      }
    }

    if (data.slug !== undefined) {
      const customSlug = slugify(data.slug);
      if (customSlug !== existing.slug) {
        const slugConflict = await prisma.material.findUnique({ where: { slug: customSlug } });
        if (slugConflict && slugConflict.id !== id) {
          throw new Error(`A material with slug "${customSlug}" already exists.`);
        }
        updateData.slug = customSlug;
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.order !== undefined) {
      updateData.order = data.order;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return await prisma.material.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Safe Material Deletion:
   * Block deletion while products reference the material.
   * Clear any homepage card references safely.
   */
  static async deleteMaterial(id: string): Promise<void> {
    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new Error(`Material with ID "${id}" was not found.`);
    }

    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        materialId: true,
        material: true,
        materials: true,
      },
    });

    const matchingProducts = allProducts.filter((p) =>
      productMatchesMaterialRecord(p, material)
    );

    if (matchingProducts.length > 0) {
      const err: any = new Error(
        `Cannot delete material "${material.name}" because it is currently assigned to ${matchingProducts.length} product(s). Please reassign or unassign those products first.`
      );
      err.code = "MATERIAL_IN_USE";
      err.productCount = matchingProducts.length;
      throw err;
    }

    // Safely decoupling any homepage cards referencing this material
    await prisma.materialCard.updateMany({
      where: { materialId: id },
      data: { materialId: null },
    });

    await prisma.material.delete({
      where: { id },
    });
    logger.info({ id, name: material.name }, "Material deleted safely");
  }

  /**
   * Reorder materials.
   */
  static async reorderMaterials(orderedIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.material.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  }

  /**
   * Retrieves the current Materials Homepage Section settings and cards.
   */
  static async getHomepageSection(options: { publicOnly?: boolean } = {}) {
    const { publicOnly = false } = options;

    let setting = await prisma.materialSectionSetting.findUnique({
      where: { id: "current" },
      include: {
        cards: {
          orderBy: { order: "asc" },
          include: {
            material: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!setting) {
      await this.seedInitialData();
      setting = await prisma.materialSectionSetting.findUnique({
        where: { id: "current" },
        include: {
          cards: {
            orderBy: { order: "asc" },
            include: {
              material: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });
    }

    if (!setting) {
      throw new Error("Failed to initialize or fetch Materials section settings.");
    }

    let cards = setting.cards;
    if (publicOnly) {
      cards = cards.filter((c) => c.isActive && (!c.material || c.material.isActive));
    }

    return {
      id: setting.id,
      heading: setting.heading,
      version: setting.version,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
      cards: cards.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        ctaText: c.ctaText,
        imageUrl: c.imageUrl,
        imageAlt: c.imageAlt,
        materialId: c.materialId,
        material: c.material
          ? {
              id: c.material.id,
              name: c.material.name,
              slug: c.material.slug,
              isActive: c.material.isActive,
            }
          : null,
        order: c.order,
        isActive: c.isActive,
      })),
    };
  }

  /**
   * Updates and publishes the Materials Homepage Section.
   * Creates an independent snapshot in MaterialSectionHistory before updating.
   */
  static async updateHomepageSection(
    input: MaterialSectionUpdateInput,
    adminUser = "admin"
  ) {
    const current = await this.getHomepageSection({ publicOnly: false });

    return await prisma.$transaction(
      async (tx) => {
        // 1. Snapshot current state into MaterialSectionHistory
        await tx.materialSectionHistory.create({
          data: {
            version: current.version,
            heading: current.heading,
            cards: current.cards as any,
            description: `Snapshot before publishing version ${current.version + 1}`,
            createdBy: adminUser,
          },
        });

        const nextVersion = current.version + 1;
        const heading = input.heading?.trim() || current.heading;

        // 2. Upsert Section Setting
        const updatedSetting = await tx.materialSectionSetting.upsert({
          where: { id: "current" },
          create: {
            id: "current",
            heading,
            version: nextVersion,
            updatedBy: adminUser,
          },
          update: {
            heading,
            version: nextVersion,
            updatedBy: adminUser,
          },
        });

        // 3. Update cards if provided
        if (input.cards && Array.isArray(input.cards)) {
          await tx.materialCard.deleteMany({
            where: { sectionId: "current" },
          });

          // Pre-fetch all requested material IDs in a single query
          const requestedMaterialIds = input.cards
            .map((c) => c.materialId)
            .filter((id): id is string => Boolean(id));

          const existingMaterials = requestedMaterialIds.length > 0
            ? await tx.material.findMany({
                where: { id: { in: requestedMaterialIds } },
                select: { id: true },
              })
            : [];
          const validIdSet = new Set(existingMaterials.map((m) => m.id));

          if (input.cards.length > 0) {
            await tx.materialCard.createMany({
              data: input.cards.map((card, i) => ({
                sectionId: "current",
                title: card.title.trim(),
                description: card.description.trim(),
                ctaText: (card.ctaText?.trim() || "EXPLORE NOW").toUpperCase(),
                imageUrl: card.imageUrl.trim(),
                imageAlt: card.imageAlt?.trim() || null,
                materialId: card.materialId && validIdSet.has(card.materialId) ? card.materialId : null,
                order: card.order !== undefined ? card.order : i,
                isActive: card.isActive ?? true,
              })),
            });
          }
        }

        // 4. Return new published configuration
        const published = await tx.materialSectionSetting.findUniqueOrThrow({
          where: { id: "current" },
          include: {
            cards: {
              orderBy: { order: "asc" },
              include: {
                material: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        });

        return {
          id: published.id,
          heading: published.heading,
          version: published.version,
          updatedAt: published.updatedAt,
          updatedBy: published.updatedBy,
          cards: published.cards.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            ctaText: c.ctaText,
            imageUrl: c.imageUrl,
            imageAlt: c.imageAlt,
            materialId: c.materialId,
            material: c.material,
            order: c.order,
            isActive: c.isActive,
          })),
        };
      },
      {
        maxWait: 20000,
        timeout: 60000,
      }
    );
  }

  /**
   * Retrieves version history for the Materials section.
   */
  static async getSectionHistory() {
    return await prisma.materialSectionHistory.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Restores an older version of the Materials section from history.
   */
  static async restoreSectionVersion(historyId: string, adminUser = "admin") {
    const historyItem = await prisma.materialSectionHistory.findUnique({
      where: { id: historyId },
    });

    if (!historyItem) {
      throw new Error(`Version history item "${historyId}" was not found.`);
    }

    const current = await this.getHomepageSection({ publicOnly: false });

    return await prisma.$transaction(
      async (tx) => {
        // Create backup snapshot of current before restoring
        await tx.materialSectionHistory.create({
          data: {
            version: current.version,
            heading: current.heading,
            cards: current.cards as any,
            description: `Backup snapshot before restoring version ${historyItem.version}`,
            createdBy: adminUser,
          },
        });

        const nextVersion = current.version + 1;
        const snapshotCards = Array.isArray(historyItem.cards)
          ? (historyItem.cards as any[])
          : [];

        // Update setting
        await tx.materialSectionSetting.update({
          where: { id: "current" },
          data: {
            heading: historyItem.heading,
            version: nextVersion,
            updatedBy: adminUser,
          },
        });

        // Recreate cards from snapshot
        await tx.materialCard.deleteMany({
          where: { sectionId: "current" },
        });

        const requestedMaterialIds = snapshotCards
          .map((c) => c.materialId)
          .filter((id): id is string => Boolean(id));

        const existingMaterials = requestedMaterialIds.length > 0
          ? await tx.material.findMany({
              where: { id: { in: requestedMaterialIds } },
              select: { id: true },
            })
          : [];
        const validIdSet = new Set(existingMaterials.map((m) => m.id));

        if (snapshotCards.length > 0) {
          await tx.materialCard.createMany({
            data: snapshotCards.map((c, i) => ({
              sectionId: "current",
              title: c.title,
              description: c.description,
              ctaText: c.ctaText || "EXPLORE NOW",
              imageUrl: c.imageUrl,
              imageAlt: c.imageAlt || null,
              materialId: c.materialId && validIdSet.has(c.materialId) ? c.materialId : null,
              order: c.order !== undefined ? c.order : i,
              isActive: c.isActive ?? true,
            })),
          });
        }

        logger.info(
          { fromVersion: historyItem.version, newVersion: nextVersion },
          "Materials section restored successfully"
        );

        return await tx.materialSectionSetting.findUniqueOrThrow({
          where: { id: "current" },
          include: {
            cards: {
              orderBy: { order: "asc" },
              include: {
                material: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        });
      },
      {
        maxWait: 20000,
        timeout: 60000,
      }
    );
  }

  /**
   * Idempotent Baseline Seeder:
   * 1. Seeds baseline Materials if table is empty.
   * 2. Maps existing products to their corresponding material.
   * 3. Seeds the initial 3 editorial cards into MongoDB.
   */
  static async seedInitialData(): Promise<void> {
    try {
      // 1. Seed baseline materials
      const baselineMaterials = [
        { name: "Gold", slug: "gold", description: "Timeless 18k solid yellow, white, and rose gold.", order: 0 },
        { name: "Diamond", slug: "diamond", description: "Ethically crafted brilliant-cut and solitaire diamonds.", order: 1 },
        { name: "Rose Gold", slug: "rose-gold", description: "Romantic blush-toned 18k fine jewellery.", order: 2 },
        { name: "Platinum", slug: "platinum", description: "Rare and resilient 950 purity platinum.", order: 3 },
        { name: "Silver", slug: "silver", description: "925 sterling silver artisan pieces.", order: 4 },
        { name: "Emerald", slug: "emerald", description: "Vibrant natural and lab-created green emeralds.", order: 5 },
      ];

      for (const mat of baselineMaterials) {
        const existing = await prisma.material.findUnique({ where: { slug: mat.slug } });
        if (!existing) {
          await prisma.material.create({
            data: {
              name: mat.name,
              slug: mat.slug,
              description: mat.description,
              order: mat.order,
              isActive: true,
            },
          });
        }
      }

      // Fetch all available materials
      const allMaterials = await prisma.material.findMany();
      const materialMap = new Map<string, string>(); // name/slug lowercase -> id
      for (const m of allMaterials) {
        materialMap.set(m.name.toLowerCase(), m.id);
        materialMap.set(m.slug.toLowerCase(), m.id);
      }

      // 2. Map existing unlinked products to materials
      const unlinkedProducts = await prisma.product.findMany({
        where: { materialId: null },
      });

      for (const prod of unlinkedProducts) {
        let matchedId: string | undefined;

        // Check product.materials JSON array
        const rawMaterials = Array.isArray(prod.materials) ? (prod.materials as string[]) : [];
        for (const tag of rawMaterials) {
          if (typeof tag === "string") {
            const id = materialMap.get(tag.toLowerCase());
            if (id) {
              matchedId = id;
              break;
            }
          }
        }

        // Check product.material text field
        if (!matchedId && prod.material) {
          const lower = prod.material.toLowerCase();
          for (const [key, id] of materialMap.entries()) {
            if (lower.includes(key)) {
              matchedId = id;
              break;
            }
          }
        }

        // Default to Gold for fine jewellery if still unlinked
        if (!matchedId) {
          matchedId = materialMap.get("gold") || allMaterials[0]?.id;
        }

        if (matchedId) {
          await prisma.product.update({
            where: { id: prod.id },
            data: { materialId: matchedId },
          });
        }
      }

      // 3. Seed MaterialSectionSetting and Cards if missing
      const existingSetting = await prisma.materialSectionSetting.findUnique({
        where: { id: "current" },
        include: { cards: true },
      });

      if (!existingSetting) {
        const diamondId = materialMap.get("diamond") || allMaterials[0]?.id || null;
        const emeraldId = materialMap.get("emerald") || allMaterials[0]?.id || null;
        const goldId = materialMap.get("gold") || allMaterials[0]?.id || null;

        await prisma.materialSectionSetting.upsert({
          where: { id: "current" },
          update: {},
          create: {
            id: "current",
            heading: "Designed in India. Crafted with timeless elegance.",
            version: 1,
            updatedBy: "system",
            cards: {
              create: [
                {
                  title: "Lab Grown Diamonds",
                  description: "Discover the exceptional quality & sparkle.",
                  ctaText: "EXPLORE NOW",
                  imageUrl: "/images/editorial/lab-grown-diamonds.jpg",
                  imageAlt: "Model wearing brilliant-cut lab-grown diamond bracelets and a solitaire diamond ring",
                  materialId: diamondId,
                  order: 0,
                  isActive: true,
                },
                {
                  title: "Tennis Bracelets",
                  description: "Classic tennis bracelets designed for a lifetime.",
                  ctaText: "SHOP COLLECTION",
                  imageUrl: "/images/editorial/tennis-bracelets.jpg",
                  imageAlt: "Model in tailored charcoal blazer showcasing a classic diamond tennis bracelet",
                  materialId: diamondId || goldId,
                  order: 1,
                  isActive: true,
                },
                {
                  title: "Garden Variety",
                  description: "Add our new arrivals to your weekly lineup.",
                  ctaText: "DISCOVER NOW",
                  imageUrl: "/images/editorial/garden-variety.jpg",
                  imageAlt: "Editorial portrait showcasing sparkling floral cluster diamond drop earrings",
                  materialId: emeraldId || diamondId,
                  order: 2,
                  isActive: true,
                },
              ],
            },
          },
        });
        logger.info("Materials section baseline settings and cards seeded in MongoDB");
      }
    } catch (err) {
      logger.error({ err }, "Error during MaterialService initial seeding");
    }
  }
}
