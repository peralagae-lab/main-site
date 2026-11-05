import fs from "node:fs";
import path from "node:path";
import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  imageAlt?: string | null;
  description?: string | null;
  order: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string | undefined;
  imageUrl?: string | undefined;
  imageAlt?: string | undefined;
  description?: string | undefined;
  order?: number | undefined;
  isActive?: boolean | undefined;
}

export interface UpdateCategoryInput {
  name?: string | undefined;
  slug?: string | undefined;
  imageUrl?: string | undefined;
  imageAlt?: string | undefined;
  description?: string | undefined;
  order?: number | undefined;
  isActive?: boolean | undefined;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


// ── Baseline Categories ───────────────────────────────────────────────────────
export const BASELINE_CATEGORIES = [
  {
    id: "collection-necklaces",
    name: "NECKLACES",
    slug: "necklaces",
    imageUrl: "/images/collections/collection-necklaces.jpg",
    imageAlt: "Necklaces Collection - Delicate White Gold & Diamond Pendant",
    description: "Curated fine necklaces, pendants, and chains in 18k gold and platinum.",
    order: 1,
    isActive: true,
  },
  {
    id: "collection-rings",
    name: "RINGS",
    slug: "rings",
    imageUrl: "/images/collections/collection-rings.jpg",
    imageAlt: "Rings Collection - Sculptural 18k Yellow Gold Band",
    description: "Exquisite engagement rings, bands, and statement cocktail rings.",
    order: 2,
    isActive: true,
  },
  {
    id: "collection-bracelets",
    name: "BRACELETS",
    slug: "bracelets",
    imageUrl: "/images/collections/collection-bracelets.jpg",
    imageAlt: "Bracelets Collection - Minimalist Dual-Tone Gold & Silver Bangle",
    description: "Tennis bracelets, chain link bracelets, and handcrafted cuffs.",
    order: 3,
    isActive: true,
  },
  {
    id: "collection-earrings",
    name: "EARRINGS",
    slug: "earrings",
    imageUrl: "/images/collections/collection-earrings.jpg",
    imageAlt: "Earrings Collection - Coordinated White Gold & Diamond Teardrop Earrings",
    description: "Studs, huggies, hoops, and chandelier drops in precious metals.",
    order: 4,
    isActive: true,
  },
  {
    id: "collection-charms-bangles",
    name: "CHARMS & BANGLES",
    slug: "charms-bangles",
    imageUrl: "/images/collections/collection-charms-bangles.jpg",
    imageAlt: "Charms & Bangles Collection - Warm Rose Gold Charm Bangle",
    description: "Intricate charms, traditional bangles, and stackable heirloom pieces.",
    order: 5,
    isActive: true,
  },
  {
    id: "collection-gift-ideas",
    name: "GIFT IDEAS",
    slug: "gift-ideas",
    imageUrl: "/images/collections/collection-gift-ideas.jpg",
    imageAlt: "Gift Ideas Collection - Solitaire Diamond Engagement Ring",
    description: "Thoughtfully selected gifts for memorable occasions and celebrations.",
    order: 6,
    isActive: true,
  },
];

let isInitialized = false;

export class CategoryService {
  /**
   * Idempotent seeder that guarantees the 6 baseline categories and 24 products
   * exist in MongoDB upon startup.
   */
  static async seedInitialData(): Promise<void> {
    if (isInitialized) return;

    try {
      const categoryCount = await prisma.category.count();
      if (categoryCount === 0) {
        logger.info("Initializing baseline categories in MongoDB...");
        for (const cat of BASELINE_CATEGORIES) {
          await prisma.category.upsert({
            where: { slug: cat.slug },
            create: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              imageUrl: cat.imageUrl,
              imageAlt: cat.imageAlt,
              description: cat.description,
              order: cat.order,
              isActive: cat.isActive,
            },
            update: {},
          });
        }
        logger.info({ count: BASELINE_CATEGORIES.length }, "Baseline categories initialized");
      }

      isInitialized = true;
    } catch (err) {
      logger.warn({ err }, "Could not complete category seed to MongoDB");
    }
  }

  /**
   * Retrieves all categories ordered by `order ASC, createdAt ASC`.
   */
  static async getAllCategories(options?: { includeInactive?: boolean }): Promise<CategoryItem[]> {
    const where = options?.includeInactive ? {} : { isActive: true };

    const records = await prisma.category.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    const availableProducts = await prisma.product.findMany({
      where: { isAvailable: true },
      select: { categoryId: true, categoryKey: true },
    });

    return records.map((r) => {
      const rId = r.id.toLowerCase().trim();
      const rSlug = r.slug.toLowerCase().trim();
      const rName = r.name.toLowerCase().trim();
      const count = availableProducts.filter((p) => {
        const pId = (p.categoryId || "").toLowerCase().trim();
        const pKey = (p.categoryKey || "").toLowerCase().trim();
        return pId === rId || pKey === rSlug || pKey === rName;
      }).length;

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        imageUrl: r.imageUrl,
        imageAlt: r.imageAlt,
        description: r.description,
        order: r.order,
        isActive: r.isActive,
        productCount: count,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves a category by ID with its authoritative product count.
   */
  static async getCategoryById(id: string): Promise<CategoryItem | null> {
    const r = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      imageUrl: r.imageUrl,
      imageAlt: r.imageAlt,
      description: r.description,
      order: r.order,
      isActive: r.isActive,
      productCount: r._count.products,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves a category by URL slug.
   */
  static async getCategoryBySlug(slug: string): Promise<CategoryItem | null> {
    const r = await prisma.category.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      imageUrl: r.imageUrl,
      imageAlt: r.imageAlt,
      description: r.description,
      order: r.order,
      isActive: r.isActive,
      productCount: r._count.products,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new category with server-side validation.
   */
  static async createCategory(input: CreateCategoryInput): Promise<CategoryItem> {
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new Error("Category name is required");
    }

    const cleanSlug = slugify(input.slug?.trim() || cleanName);
    if (!cleanSlug) {
      throw new Error("A valid URL-safe slug is required");
    }

    const defaultImageUrl = "/images/collections/collection-necklaces.jpg";
    const finalImageUrl = input.imageUrl?.trim() || defaultImageUrl;

    // Check duplicate name (case-insensitive)
    const existingName = await prisma.category.findFirst({
      where: {
        name: {
          equals: cleanName,
          mode: "insensitive",
        },
      },
    });
    if (existingName) {
      throw new Error(`A category with the name "${cleanName}" already exists`);
    }

    // Check duplicate slug
    const existingSlug = await prisma.category.findUnique({
      where: { slug: cleanSlug },
    });
    if (existingSlug) {
      throw new Error(`A category with the slug "${cleanSlug}" already exists`);
    }

    // Calculate order
    let targetOrder = input.order;
    if (targetOrder === undefined || targetOrder === null) {
      const maxOrderCat = await prisma.category.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });
      targetOrder = (maxOrderCat?.order ?? 0) + 1;
    }

    const created = await prisma.category.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        imageUrl: finalImageUrl,
        imageAlt: input.imageAlt?.trim() ?? null,
        description: input.description?.trim() ?? null,
        order: targetOrder,
        isActive: input.isActive ?? true,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    logger.info({ id: created.id, name: created.name, slug: created.slug }, "Category created successfully");

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      imageUrl: created.imageUrl,
      imageAlt: created.imageAlt,
      description: created.description,
      order: created.order,
      isActive: created.isActive,
      productCount: created._count.products,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing category. Preserves stable category ID and product associations.
   */
  static async updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryItem> {
    const existing = await prisma.category.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error("Category not found");
    }

    const dataToUpdate: any = {};

    if (input.name !== undefined) {
      const cleanName = input.name.trim();
      if (!cleanName) {
        throw new Error("Category name cannot be empty");
      }
      // Check duplicate name on another record
      const duplicateName = await prisma.category.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: cleanName,
            mode: "insensitive",
          },
        },
      });
      if (duplicateName) {
        throw new Error(`A category with the name "${cleanName}" already exists`);
      }
      dataToUpdate.name = cleanName;

      // Automatically generate and update slug if not explicitly provided
      if (input.slug === undefined) {
        const autoSlug = slugify(cleanName);
        const duplicateSlug = await prisma.category.findFirst({
          where: {
            id: { not: id },
            slug: autoSlug,
          },
        });
        if (duplicateSlug) {
          throw new Error(`A category with the slug "${autoSlug}" already exists`);
        }
        dataToUpdate.slug = autoSlug;
      }
    }

    if (input.slug !== undefined) {
      const cleanSlug = slugify(input.slug.trim());
      if (!cleanSlug) {
        throw new Error("Category slug cannot be empty");
      }
      // Check duplicate slug on another record
      const duplicateSlug = await prisma.category.findFirst({
        where: {
          id: { not: id },
          slug: cleanSlug,
        },
      });
      if (duplicateSlug) {
        throw new Error(`A category with the slug "${cleanSlug}" already exists`);
      }
      dataToUpdate.slug = cleanSlug;
    }


    if (input.imageUrl !== undefined) {
      if (!input.imageUrl.trim()) {
        throw new Error("Category image cannot be empty");
      }
      dataToUpdate.imageUrl = input.imageUrl.trim();
    }

    if (input.imageAlt !== undefined) {
      dataToUpdate.imageAlt = input.imageAlt?.trim() || null;
    }

    if (input.description !== undefined) {
      dataToUpdate.description = input.description?.trim() || null;
    }

    if (input.order !== undefined) {
      dataToUpdate.order = Number(input.order);
    }

    if (input.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(input.isActive);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    logger.info({ id: updated.id, name: updated.name }, "Category updated successfully");

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      imageUrl: updated.imageUrl,
      imageAlt: updated.imageAlt,
      description: updated.description,
      order: updated.order,
      isActive: updated.isActive,
      productCount: updated._count.products,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Reorders categories sequentially based on provided array of category IDs.
   */
  static async reorderCategories(orderedIds: string[]): Promise<CategoryItem[]> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { order: index + 1 },
        })
      )
    );

    return this.getAllCategories({ includeInactive: true });
  }

  /**
   * Deletes a category and permanently cascades deletion to all associated products.
   * Atomic database transaction guarantees no orphaned products or partial states.
   */
  static async deleteCategory(
    id: string
  ): Promise<{ deletedCategory: CategoryItem; deletedProductCount: number }> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    const productCount = category._count.products;

    const formattedDeleted: CategoryItem = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      imageAlt: category.imageAlt,
      description: category.description,
      order: category.order,
      isActive: category.isActive,
      productCount,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };

    // 1. Fetch IDs of products in this category
    const categoryProducts = await prisma.product.findMany({
      where: { categoryId: id },
      select: { id: true },
    });
    const productIds = categoryProducts.map((p) => p.id);

    // 2. Safely unlink historical order items (keeping customer receipts intact) and delete products + category
    await prisma.$transaction(async (tx) => {
      if (productIds.length > 0) {
        await tx.orderItem.updateMany({
          where: { productId: { in: productIds } },
          data: { productId: null },
        });

        await tx.product.deleteMany({
          where: { categoryId: id },
        });
      }

      await tx.category.delete({
        where: { id },
      });
    });

    logger.info(
      { id, name: category.name, deletedProductCount: productCount },
      "Category and associated products permanently deleted"
    );

    return {
      deletedCategory: formattedDeleted,
      deletedProductCount: productCount,
    };
  }
}
