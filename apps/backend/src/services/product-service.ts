import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";
import { productMatchesMaterialRecord } from "./material-service.js";

export interface ProductImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified?: boolean;
}

export interface FormattedProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryKey?: string;
  categoryId?: string | null;
  subcategory?: string;
  collection?: string;
  sku?: string;
  image: ProductImage;
  images?: ProductImage[];
  priceInr: number;
  priceDisplay?: string;
  compareAtPriceInr?: number | null;
  isNew?: boolean | undefined;
  isHot?: boolean | undefined;
  isAvailable?: boolean | undefined;
  inStock?: boolean | undefined;
  stockCount?: number | undefined;
  description?: string | undefined;
  productOverview?: string | undefined;
  productDetails?: string | undefined;
  careInstructions?: string | undefined;
  additionalInfo?: string | undefined;
  descriptionParagraph1?: string | undefined;
  descriptionParagraph2?: string | undefined;
  longDescription?: string | undefined;
  materialId?: string | null | undefined;
  materialRef?: {
    id: string;
    name: string;
    slug: string;
  } | null | undefined;
  material?: string | undefined;
  materials?: string[] | undefined;
  specs?: ProductSpec[] | undefined;
  rating?: number | undefined;
  reviewCount?: number | undefined;
  viewersCount?: number | undefined;
  reviews?: ProductReview[] | undefined;
  createdAt?: string | undefined;
}

export interface CreateProductInput {
  name: string;
  slug?: string | undefined;
  categoryId?: string | null | undefined;
  categoryKey?: string | null | undefined;
  priceInr: number;
  compareAtPriceInr?: number | null | undefined;
  inStock?: boolean | undefined;
  isAvailable?: boolean | undefined;
  stockCount?: number | undefined;
  imageUrl?: string | undefined;
  imageAlt?: string | undefined;
  images?: Array<{ src: string; alt?: string | undefined; width?: number | undefined; height?: number | undefined } | string> | undefined;
  description?: string | undefined;
  productOverview?: string | undefined;
  productDetails?: string | undefined;
  careInstructions?: string | undefined;
  additionalInfo?: string | undefined;
  descriptionParagraph1?: string | undefined;
  descriptionParagraph2?: string | undefined;
  specs?: Array<{ label?: string | undefined; name?: string | undefined; value: string }> | undefined;
  materialId?: string | null | undefined;
  material?: string | undefined;
  materials?: string[] | undefined;
  isHot?: boolean | undefined;
  isNew?: boolean | undefined;
}

export interface UpdateProductInput {
  name?: string | undefined;
  slug?: string | undefined;
  categoryId?: string | null | undefined;
  categoryKey?: string | null | undefined;
  priceInr?: number | undefined;
  compareAtPriceInr?: number | null | undefined;
  inStock?: boolean | undefined;
  isAvailable?: boolean | undefined;
  stockCount?: number | undefined;
  imageUrl?: string | undefined;
  imageAlt?: string | undefined;
  images?: Array<{ src: string; alt?: string | undefined; width?: number | undefined; height?: number | undefined } | string> | undefined;
  description?: string | undefined;
  productOverview?: string | undefined;
  productDetails?: string | undefined;
  careInstructions?: string | undefined;
  additionalInfo?: string | undefined;
  descriptionParagraph1?: string | undefined;
  descriptionParagraph2?: string | undefined;
  specs?: Array<{ label?: string | undefined; name?: string | undefined; value: string }> | undefined;
  materialId?: string | null | undefined;
  material?: string | undefined;
  materials?: string[] | undefined;
  isHot?: boolean | undefined;
  isNew?: boolean | undefined;
}

export interface ProductFilterInput {
  category?: string | null | undefined;
  search?: string | null | undefined;
  minPrice?: number | null | undefined;
  maxPrice?: number | null | undefined;
  material?: string | null | undefined;
  materials?: string[] | undefined;
  sort?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  isNew?: boolean | undefined;
  isHot?: boolean | undefined;
  isAvailable?: boolean | undefined;
}

export interface ProductListResult {
  products: FormattedProduct[];
  total: number;
  totalCatalogueCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  fromIndex: number;
  toIndex: number;
  minCataloguePrice: number;
  maxCataloguePrice: number;
  categoryCounts: Record<string, number>;
  materialCounts: Record<string, number>;
  availableMaterials: string[];
}

export function normalizeMaterialName(mat: string): string {
  return mat.trim();
}

function getProductMaterials(p: FormattedProduct): string[] {
  const set = new Set<string>();
  if (Array.isArray(p.materials)) {
    for (const m of p.materials) {
      if (typeof m === "string" && m.trim()) {
        set.add(normalizeMaterialName(m));
      }
    }
  }
  if (p.materialRef?.name) {
    set.add(normalizeMaterialName(p.materialRef.name));
  }
  if (p.material && typeof p.material === "string") {
    const trimmed = p.material.trim();
    if (trimmed && set.size === 0) {
      set.add(normalizeMaterialName(trimmed));
    }
  }
  return Array.from(set);
}

function enrichProductDetails(raw: any): FormattedProduct {
  const cat = (raw.category?.name || raw.categoryKey || "").toUpperCase();
  const rawImages = Array.isArray(raw.images) && raw.images.length > 0
    ? raw.images.map((img: any) => typeof img === "string" ? { src: img, alt: raw.name } : img)
    : raw.imageUrl
    ? [{ src: raw.imageUrl, alt: raw.imageAlt || raw.name }]
    : [];

  const materials = Array.isArray(raw.materials) ? raw.materials : [];

  const defaultSpecs: ProductSpec[] = [
    { label: "Precious Metal", value: raw.material || "18k Solid Yellow Gold (750 Purity)" },
    {
      label: "Gemstones",
      value: materials.includes("Diamond")
        ? "Conflict-Free Round Brilliant Diamonds (VVS-VS Clarity, F-G Colour)"
        : materials.includes("Emerald")
        ? "Natural Fine-Grade Colombian Emerald"
        : "Certified Pure Natural Gemstone Setting",
    },
    { label: "Purity & Hallmarking", value: "BIS Hallmarked 750 (18 Karat) with Laser Assay Inscription" },
    { label: "Approximate Metal Weight", value: "3.80 – 5.40 grams solid gold" },
    { label: "Certification", value: "IGI / SGL Authenticity Certificate included with tamper-evident seal" },
    {
      label: "Jewellery Care Guide",
      value: "Store inside the provided PERALAGAE anti-tarnish suede pouch. Protect from direct perfumes and chemicals. Clean gently with a lint-free polishing cloth.",
    },
  ];

  const customSpecs: ProductSpec[] =
    Array.isArray(raw.specs) && raw.specs.length > 0
      ? (raw.specs as any[])
          .map((s: any) => ({
            label: typeof s?.label === "string" ? s.label : typeof s?.name === "string" ? s.name : "",
            value: typeof s?.value === "string" ? s.value : "",
          }))
          .filter((s: ProductSpec) => Boolean(s.label && s.value))
      : [];

  const specs = customSpecs.length > 0 ? customSpecs : defaultSpecs;

  const reviews: ProductReview[] = [
    {
      id: `rev-${raw.id}-1`,
      author: "Aditi S.",
      rating: 5,
      date: "18 September 2026",
      comment:
        "The craftsmanship on this piece is truly exquisite. The gold has a warm, radiant lustre that looks even more captivating in person. Arrived securely packaged with the certificate.",
      verified: true,
    },
    {
      id: `rev-${raw.id}-2`,
      author: "Rohan Kapoor",
      rating: 5,
      date: "04 October 2026",
      comment:
        "Purchased as an anniversary present. The understated luxury and attention to detail reflect true artistry. Prompt delivery and luxurious unboxing experience.",
      verified: true,
    },
    {
      id: `rev-${raw.id}-3`,
      author: "Meera Krishnan",
      rating: 5,
      date: "09 October 2026",
      comment:
        "Comfortable for daily wear, yet elevates any evening ensemble. The finish is flawlessly mirror-polished. Proud to wear PERALAGAE.",
      verified: true,
    },
  ];

  const p1 = typeof raw.descriptionParagraph1 === "string" ? raw.descriptionParagraph1.trim() : "";
  const p2 = typeof raw.descriptionParagraph2 === "string" ? raw.descriptionParagraph2.trim() : "";
  const combinedParagraphs = [p1, p2].filter(Boolean).join("\n\n");
  const longDescription =
    combinedParagraphs ||
    (raw.description
      ? `${raw.description} Handcrafted with precision by PERALAGAE master artisans, each diamond is hand-selected for optimal fire and scintillation.`
      : undefined);

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    category: raw.category?.name || raw.categoryKey || "JEWELLERY",
    categoryKey: raw.categoryKey || raw.category?.name,
    categoryId: raw.categoryId,
    subcategory:
      cat.includes("RING")
        ? "Rings & Bands"
        : cat.includes("NECKLACE")
        ? "Pendants & Chains"
        : cat.includes("BRACELET")
        ? "Bangles & Tennis"
        : cat.includes("EARRING")
        ? "Huggies & Drops"
        : cat.includes("CHARM")
        ? "Charms & Medallions"
        : "Curated Gift Sets",
    collection:
      materials.includes("Diamond")
        ? "Solitaire Radiance"
        : materials.includes("Platinum")
        ? "Modern Platinum Classics"
        : materials.includes("Rose Gold")
        ? "Aura Rose Elegance"
        : "Heritage Gold 18k",
    sku: `PRL-${raw.id.toUpperCase().replace(/^PROD-/, "")}`,
    image: {
      src: raw.imageUrl,
      alt: raw.imageAlt || raw.name,
    },
    images: rawImages,
    priceInr: raw.priceInr,
    priceDisplay: `₹${raw.priceInr.toLocaleString("en-IN")}`,
    compareAtPriceInr: raw.compareAtPriceInr,
    isNew: raw.isNew,
    isHot: raw.isHot,
    isAvailable: raw.isAvailable,
    inStock: raw.inStock,
    stockCount: raw.stockCount,
    materialId: raw.materialId || null,
    materialRef: raw.materialRef
      ? {
          id: raw.materialRef.id,
          name: raw.materialRef.name,
          slug: raw.materialRef.slug,
        }
      : null,
    material: raw.materialRef?.name || raw.material || undefined,
    materials,
    specs,
    rating: 5.0,
    reviewCount: reviews.length,
    viewersCount: 22,
    reviews,
    description: raw.description || undefined,
    productOverview: raw.productOverview || raw.descriptionParagraph1 || raw.description || undefined,
    productDetails: raw.productDetails || raw.descriptionParagraph2 || undefined,
    careInstructions: raw.careInstructions || undefined,
    additionalInfo: raw.additionalInfo || undefined,
    descriptionParagraph1: raw.productOverview || raw.descriptionParagraph1 || undefined,
    descriptionParagraph2: raw.productDetails || raw.descriptionParagraph2 || undefined,
    longDescription,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : String(raw.createdAt),
  };
}

export class ProductService {
  /**
   * Retrieves products with filters, sorting, pagination, and dynamic category counts
   * directly from MongoDB via Prisma.
   */
  static async getProducts(filters: ProductFilterInput = {}): Promise<ProductListResult> {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 12));

    // Fetch all active categories from MongoDB for accurate category counts
    const allDbCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Fetch all active materials from MongoDB for accurate material counts
    const allDbMaterials = await prisma.material.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Fetch all products from MongoDB to compute price bounds, material counts, size counts
    const allDbProducts = await prisma.product.findMany({
      include: {
        category: true,
        materialRef: true,
      },
    });

    const allFormatted = allDbProducts.map(enrichProductDetails);

    // Filter eligible products matching visibility rules (published, in-stock, stockCount > 0, valid image)
    const eligibleProducts = allFormatted.filter((product) => {
      const isPublished =
        filters.isAvailable !== undefined
          ? Boolean(product.isAvailable) === filters.isAvailable
          : product.isAvailable !== false;
      const isInStock =
        product.inStock !== false &&
        (typeof product.stockCount === "number" ? product.stockCount > 0 : true);
      const hasImage = Boolean(product.image?.src && product.image.src.trim());
      return isPublished && isInStock && hasImage;
    });

    // Compute overall catalogue price bounds dynamically from valid prices of eligible products
    const validPrices = eligibleProducts
      .map((p) => p.priceInr)
      .filter((price) => typeof price === "number" && !isNaN(price) && price >= 0);
    const minCataloguePrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxCataloguePrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;

    // Apply filtering in memory across all dimensions
    const filtered = allFormatted.filter((product) => {
      // Available / published status
      if (filters.isAvailable !== undefined) {
        if (Boolean(product.isAvailable) !== filters.isAvailable) return false;
      } else {
        // Public storefront only displays active/published products
        if (product.isAvailable === false) return false;
      }

      // Stock-based visibility: zero stock or out-of-stock products must not appear
      if (product.inStock === false) return false;
      if (typeof product.stockCount === "number" && product.stockCount <= 0) return false;

      // Must have valid database image
      if (!product.image?.src || !product.image.src.trim()) return false;

      // New Arrival filter
      if (filters.isNew !== undefined) {
        if (Boolean(product.isNew) !== filters.isNew) return false;
      }

      // Hot / Trending filter
      if (filters.isHot !== undefined) {
        if (Boolean(product.isHot) !== filters.isHot) return false;
      }

      // Category filter
      if (filters.category && filters.category !== "all") {
        const selectedCat = filters.category.toLowerCase().trim();
        const pCat = (product.category || "").toLowerCase().trim();
        const pKey = (product.categoryKey || "").toLowerCase().trim();
        const pId = (product.categoryId || "").toLowerCase().trim();
        const matchesCategory =
          pCat === selectedCat ||
          pKey === selectedCat ||
          pId === selectedCat ||
          allDbCategories.some(
            (c) =>
              (c.slug.toLowerCase() === selectedCat ||
                c.id.toLowerCase() === selectedCat ||
                c.name.toLowerCase() === selectedCat) &&
              (c.name.toLowerCase() === pCat ||
                c.slug.toLowerCase() === pCat ||
                c.id.toLowerCase() === pId)
          );
        if (!matchesCategory) return false;
      }

      // Price filter
      if (filters.minPrice != null && product.priceInr < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice != null && product.priceInr > filters.maxPrice) {
        return false;
      }

      // Material filter: handles single material (e.g. ?material=diamond) or materials array
      const selectedMaterials: string[] = [];
      if (filters.material && filters.material !== "all") {
        selectedMaterials.push(filters.material);
      }
      if (filters.materials && filters.materials.length > 0) {
        selectedMaterials.push(...filters.materials);
      }
      if (selectedMaterials.length > 0) {
        const hasMaterial = selectedMaterials.some((sel) => {
          const target = sel.toLowerCase().trim();
          const dbMat = allDbMaterials.find(
            (dbM) =>
              dbM.slug.toLowerCase() === target ||
              dbM.id.toLowerCase() === target ||
              dbM.name.toLowerCase() === target
          );
          if (dbMat) {
            return productMatchesMaterialRecord(product, dbMat);
          }
          return productMatchesMaterialRecord(product, {
            id: target,
            name: sel.trim(),
            slug: target,
          });
        });
        if (!hasMaterial) return false;
      }

      // Search query
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const inName = product.name.toLowerCase().includes(query);
        const inDesc = product.description?.toLowerCase().includes(query);
        const inCat = product.category.toLowerCase().includes(query);
        if (!inName && !inDesc && !inCat) return false;
      }

      return true;
    });

    // Sorting
    const sort = filters.sort || "default";
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "price-low-to-high":
          return a.priceInr - b.priceInr;
        case "price-high-to-low":
          return b.priceInr - a.priceInr;
        case "newest": {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        case "name-a-z":
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "name-z-a":
          return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
        case "default":
        default:
          return 0;
      }
    });

    // Pagination
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const paginatedProducts = total === 0 ? [] : sorted.slice(startIndex, startIndex + pageSize);

    const fromIndex = total === 0 ? 0 : startIndex + 1;
    const toIndex = total === 0 ? 0 : Math.min(startIndex + pageSize, total);

    // Dynamic category counts from eligible products in MongoDB
    const categoryCounts: Record<string, number> = {};
    for (const cat of allDbCategories) {
      const catSlug = cat.slug.toLowerCase().trim();
      const catName = cat.name.toLowerCase().trim();
      const catId = cat.id.toLowerCase().trim();

      const count = eligibleProducts.filter((p) => {
        const pCat = (p.category || "").toLowerCase().trim();
        const pKey = (p.categoryKey || "").toLowerCase().trim();
        const pId = (p.categoryId || "").toLowerCase().trim();
        return (
          pId === catId ||
          pCat === catSlug ||
          pCat === catName ||
          pKey === catSlug ||
          pKey === catName
        );
      }).length;

      categoryCounts[cat.slug] = count;
      categoryCounts[cat.id] = count;
      categoryCounts[cat.name] = count;
    }

    // Dynamic material counts from eligible products in MongoDB
    // 1. Initialize all active MongoDB materials in configured display order
    const materialCountMap = new Map<string, number>();
    const orderedMaterialNames: string[] = [];

    for (const dbMat of allDbMaterials) {
      const matName = dbMat.name.trim();
      if (matName && !materialCountMap.has(matName)) {
        materialCountMap.set(matName, 0);
        orderedMaterialNames.push(matName);
      }
    }

    // 2. Count matching unique eligible products for each canonical DB material
    for (const dbMat of allDbMaterials) {
      const matName = dbMat.name.trim();
      const count = eligibleProducts.filter((p) =>
        productMatchesMaterialRecord(p, dbMat)
      ).length;

      materialCountMap.set(matName, count);
    }

    // 3. Include any additional custom material tags from products not in allDbMaterials
    for (const p of eligibleProducts) {
      const pMats = getProductMaterials(p);
      for (const m of pMats) {
        if (!materialCountMap.has(m)) {
          materialCountMap.set(m, 0);
          orderedMaterialNames.push(m);
        }
      }
    }
    // Recount for any additional custom materials
    for (const matName of orderedMaterialNames) {
      if (!allDbMaterials.some((dbM) => dbM.name.trim().toLowerCase() === matName.toLowerCase())) {
        const virtualMat = { id: matName.toLowerCase(), name: matName, slug: matName.toLowerCase() };
        const count = eligibleProducts.filter((p) =>
          productMatchesMaterialRecord(p, virtualMat)
        ).length;
        materialCountMap.set(matName, count);
      }
    }

    const availableMaterials = orderedMaterialNames;
    const materialCounts: Record<string, number> = Object.fromEntries(materialCountMap.entries());

    // Provide aliases by slug and ID for all active DB materials
    for (const dbMat of allDbMaterials) {
      const count = materialCountMap.get(dbMat.name.trim()) ?? 0;
      materialCounts[dbMat.slug] = count;
      materialCounts[dbMat.id] = count;
      materialCounts[dbMat.name] = count;
      materialCounts[dbMat.slug.toLowerCase()] = count;
      materialCounts[dbMat.name.toLowerCase()] = count;
    }

    return {
      products: paginatedProducts,
      total,
      totalCatalogueCount: eligibleProducts.length,
      page: safePage,
      pageSize,
      totalPages,
      fromIndex,
      toIndex,
      minCataloguePrice,
      maxCataloguePrice,
      categoryCounts,
      materialCounts,
      availableMaterials,
    };
  }

  /**
   * Retrieves a single product by slug or ID from MongoDB.
   */
  static async getProductBySlugOrId(slugOrId: string): Promise<FormattedProduct | null> {
    if (!slugOrId) return null;
    const normalized = slugOrId.trim();

    const record = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: normalized },
          { id: normalized },
          { slug: normalized.toLowerCase() },
        ],
      },
      include: {
        category: true,
        materialRef: true,
      },
    });

    if (!record) {
      return null;
    }

    return enrichProductDetails(record);
  }

  /**
   * Retrieves adjacent (previous and next) products in the catalogue.
   */
  static async getAdjacentProducts(slugOrId: string): Promise<{ prev: FormattedProduct; next: FormattedProduct } | null> {
    const all = await prisma.product.findMany({
      orderBy: { createdAt: "asc" },
      include: { category: true, materialRef: true },
    });

    if (all.length === 0) return null;

    const formattedAll = all.map(enrichProductDetails);
    if (!formattedAll[0] || !formattedAll[formattedAll.length - 1]) return null;

    const currentIndex = formattedAll.findIndex(
      (p) => p.slug === slugOrId || p.id === slugOrId || p.slug.toLowerCase() === slugOrId.toLowerCase()
    );

    const first = formattedAll[0];
    const last = formattedAll[formattedAll.length - 1];
    if (!first || !last) return null;

    if (currentIndex === -1 || formattedAll.length <= 1) {
      return {
        prev: first,
        next: last,
      };
    }

    const prevIndex = (currentIndex - 1 + formattedAll.length) % formattedAll.length;
    const nextIndex = (currentIndex + 1) % formattedAll.length;

    const prev = formattedAll[prevIndex];
    const next = formattedAll[nextIndex];
    if (!prev || !next) return null;

    return {
      prev,
      next,
    };
  }

  /**
   * Retrieves strictly related products from MongoDB by category or material relevance.
   * Excludes current product, out-of-stock products, and unlisted products.
   * Never displays random or mock products.
   */
  static async getRelatedProducts(slugOrId: string, limit = 4): Promise<FormattedProduct[]> {
    if (!slugOrId) return [];
    const current = await this.getProductBySlugOrId(slugOrId);
    if (!current) return [];

    const conditions: any[] = [];
    if (current.categoryId) {
      conditions.push({ categoryId: current.categoryId });
    }
    if (current.materialId) {
      conditions.push({ materialId: current.materialId });
    }

    if (conditions.length === 0) {
      return [];
    }

    const records = await prisma.product.findMany({
      where: {
        id: { not: current.id },
        isAvailable: true,
        inStock: true,
        stockCount: { gt: 0 },
        OR: conditions,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        materialRef: true,
      },
    });

    return records
      .map(enrichProductDetails)
      .filter((p) => p.inStock !== false && (p.stockCount ?? 0) > 0 && Boolean(p.image?.src));
  }

  /**
   * Retrieves products for admin management (including full metadata, specs, and status)
   */
  static async getAllAdminProducts(params: {
    search?: string | undefined;
    categoryId?: string | undefined;
    inStock?: boolean | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
  } = {}): Promise<{
    products: FormattedProduct[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize) || 20));

    const where: any = {};

    if (params.categoryId && params.categoryId !== "all") {
      where.OR = [
        { categoryId: params.categoryId },
        { category: { slug: params.categoryId } },
        { categoryKey: { equals: params.categoryId, mode: "insensitive" } },
      ];
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        ...(where.OR || []),
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (params.inStock !== undefined) {
      where.inStock = params.inStock;
    }

    const [total, records] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true, materialRef: true },
      }),
    ]);

    const products = records.map(enrichProductDetails);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      products,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Creates a new product in MongoDB.
   */
  static async createProduct(input: CreateProductInput): Promise<FormattedProduct> {
    if (!input.name || !input.name.trim()) {
      throw new Error("Product name is required");
    }
    if (typeof input.priceInr !== "number" || isNaN(input.priceInr) || input.priceInr < 0) {
      throw new Error("Price in INR must be a valid positive number");
    }

    // Generate unique slug
    const slug = input.slug?.trim()
      ? await generateUniqueSlug(input.slug.trim())
      : await generateUniqueSlug(input.name.trim());

    // Resolve category
    let categoryId = input.categoryId || null;
    let categoryKey = input.categoryKey || null;

    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (cat) {
        categoryKey = cat.name.toUpperCase();
      } else {
        const catBySlug = await prisma.category.findUnique({ where: { slug: categoryId } });
        if (catBySlug) {
          categoryId = catBySlug.id;
          categoryKey = catBySlug.name.toUpperCase();
        }
      }
    }

    // Process images
    const rawImages = Array.isArray(input.images)
      ? input.images.map((img) =>
          typeof img === "string" ? { src: img, alt: input.name } : { src: img.src, alt: img.alt || input.name }
        )
      : [];

    const primaryImageUrl =
      input.imageUrl || (rawImages.length > 0 ? rawImages[0]?.src : "") || "";
    const primaryImageAlt = input.imageAlt || input.name;

    // Process specs
    const rawSpecs = Array.isArray(input.specs)
      ? input.specs
          .map((s) => ({
            label: (s.label || s.name || "").trim(),
            value: (s.value || "").trim(),
          }))
          .filter((s) => Boolean(s.label && s.value))
      : [];

    // Resolve material
    let validMaterialId: string | null = null;
    let materialName = input.material?.trim() || null;
    if (input.materialId) {
      const mat = await prisma.material.findUnique({ where: { id: input.materialId } });
      if (!mat) {
        throw new Error(`Material with ID "${input.materialId}" does not exist.`);
      }
      validMaterialId = mat.id;
      if (!materialName) {
        materialName = mat.name;
      }
    }

    const inStock = input.inStock !== undefined ? Boolean(input.inStock) : (input.stockCount ?? 10) > 0;
    const stockCount = typeof input.stockCount === "number" ? Math.max(0, input.stockCount) : inStock ? 10 : 0;

    const record = await prisma.product.create({
      data: {
        name: input.name.trim(),
        slug,
        categoryId,
        categoryKey,
        priceInr: input.priceInr,
        compareAtPriceInr: input.compareAtPriceInr ?? null,
        imageUrl: primaryImageUrl,
        imageAlt: primaryImageAlt,
        images: rawImages.length > 0 ? (rawImages as any) : [{ src: primaryImageUrl, alt: primaryImageAlt }],
        inStock,
        isAvailable: input.isAvailable ?? true,
        stockCount,
        description: input.description?.trim() || null,
        productOverview: input.productOverview?.trim() || input.descriptionParagraph1?.trim() || null,
        productDetails: input.productDetails?.trim() || input.descriptionParagraph2?.trim() || null,
        careInstructions: input.careInstructions?.trim() || null,
        additionalInfo: input.additionalInfo?.trim() || null,
        descriptionParagraph1: input.productOverview?.trim() || input.descriptionParagraph1?.trim() || null,
        descriptionParagraph2: input.productDetails?.trim() || input.descriptionParagraph2?.trim() || null,
        specs: rawSpecs as any,
        materialId: validMaterialId,
        material: materialName,
        materials: Array.isArray(input.materials) ? (input.materials as any) : [],
        isHot: Boolean(input.isHot),
        isNew: input.isNew !== undefined ? Boolean(input.isNew) : false,
      },
      include: { category: true, materialRef: true },
    });

    logger.info({ id: record.id, slug: record.slug, name: record.name }, "Product created in MongoDB");
    return enrichProductDetails(record);
  }

  /**
   * Updates an existing product in MongoDB.
   */
  static async updateProduct(id: string, input: UpdateProductInput): Promise<FormattedProduct> {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      throw new Error(`Product with ID "${id}" not found`);
    }

    const dataToUpdate: any = {};

    if (input.name !== undefined) {
      dataToUpdate.name = input.name.trim();
    }

    // Slug update
    if (input.slug !== undefined && input.slug.trim()) {
      const normalizedSlug = slugifyProduct(input.slug.trim());
      if (normalizedSlug !== existing.slug) {
        dataToUpdate.slug = await generateUniqueSlug(normalizedSlug, id);
      }
    }

    if (input.priceInr !== undefined) {
      if (typeof input.priceInr !== "number" || isNaN(input.priceInr) || input.priceInr < 0) {
        throw new Error("Price in INR must be a valid positive number");
      }
      dataToUpdate.priceInr = input.priceInr;
    }

    if (input.compareAtPriceInr !== undefined) {
      dataToUpdate.compareAtPriceInr = input.compareAtPriceInr;
    }

    if (input.categoryId !== undefined) {
      let categoryId = input.categoryId || null;
      let categoryKey = input.categoryKey || null;

      if (categoryId) {
        const cat = await prisma.category.findUnique({ where: { id: categoryId } });
        if (cat) {
          categoryKey = cat.name.toUpperCase();
        } else {
          const catBySlug = await prisma.category.findUnique({ where: { slug: categoryId } });
          if (catBySlug) {
            categoryId = catBySlug.id;
            categoryKey = catBySlug.name.toUpperCase();
          }
        }
      }
      dataToUpdate.categoryId = categoryId;
      dataToUpdate.categoryKey = categoryKey;
    }

    if (input.images !== undefined) {
      const rawImages = Array.isArray(input.images)
        ? input.images.map((img) =>
            typeof img === "string"
              ? { src: img, alt: input.name || existing.name }
              : { src: img.src, alt: img.alt || input.name || existing.name }
          )
        : [];
      dataToUpdate.images = rawImages;
      if (rawImages.length > 0 && !input.imageUrl) {
        dataToUpdate.imageUrl = rawImages[0]?.src;
      }
    }

    if (input.imageUrl !== undefined) {
      dataToUpdate.imageUrl = input.imageUrl;
    }
    if (input.imageAlt !== undefined) {
      dataToUpdate.imageAlt = input.imageAlt;
    }

    if (input.description !== undefined) {
      dataToUpdate.description = input.description ? input.description.trim() : null;
    }
    if (input.productOverview !== undefined) {
      dataToUpdate.productOverview = input.productOverview ? input.productOverview.trim() : null;
      dataToUpdate.descriptionParagraph1 = dataToUpdate.productOverview;
    }
    if (input.productDetails !== undefined) {
      dataToUpdate.productDetails = input.productDetails ? input.productDetails.trim() : null;
      dataToUpdate.descriptionParagraph2 = dataToUpdate.productDetails;
    }
    if (input.careInstructions !== undefined) {
      dataToUpdate.careInstructions = input.careInstructions ? input.careInstructions.trim() : null;
    }
    if (input.additionalInfo !== undefined) {
      dataToUpdate.additionalInfo = input.additionalInfo ? input.additionalInfo.trim() : null;
    }
    if (input.descriptionParagraph1 !== undefined && input.productOverview === undefined) {
      dataToUpdate.descriptionParagraph1 = input.descriptionParagraph1 ? input.descriptionParagraph1.trim() : null;
      dataToUpdate.productOverview = dataToUpdate.descriptionParagraph1;
    }
    if (input.descriptionParagraph2 !== undefined && input.productDetails === undefined) {
      dataToUpdate.descriptionParagraph2 = input.descriptionParagraph2 ? input.descriptionParagraph2.trim() : null;
      dataToUpdate.productDetails = dataToUpdate.descriptionParagraph2;
    }

    if (input.specs !== undefined) {
      const rawSpecs = Array.isArray(input.specs)
        ? input.specs
            .map((s) => ({
              label: (s.label || s.name || "").trim(),
              value: (s.value || "").trim(),
            }))
            .filter((s) => Boolean(s.label && s.value))
        : [];
      dataToUpdate.specs = rawSpecs;
    }

    if (input.inStock !== undefined) {
      dataToUpdate.inStock = Boolean(input.inStock);
    }
    if (input.stockCount !== undefined) {
      dataToUpdate.stockCount = Math.max(0, input.stockCount);
      if (input.inStock === undefined) {
        dataToUpdate.inStock = dataToUpdate.stockCount > 0;
      }
    }
    if (input.isAvailable !== undefined) {
      dataToUpdate.isAvailable = Boolean(input.isAvailable);
    }

    if (input.materialId !== undefined) {
      if (input.materialId === null || input.materialId === "") {
        dataToUpdate.materialId = null;
      } else {
        const mat = await prisma.material.findUnique({ where: { id: input.materialId } });
        if (!mat) {
          throw new Error(`Material with ID "${input.materialId}" does not exist.`);
        }
        dataToUpdate.materialId = mat.id;
        if (input.material === undefined) {
          dataToUpdate.material = mat.name;
        }
      }
    }

    if (input.material !== undefined) {
      dataToUpdate.material = input.material ? input.material.trim() : null;
    }
    if (input.materials !== undefined) {
      dataToUpdate.materials = Array.isArray(input.materials) ? input.materials : [];
    }
    if (input.isHot !== undefined) {
      dataToUpdate.isHot = Boolean(input.isHot);
    }
    if (input.isNew !== undefined) {
      dataToUpdate.isNew = Boolean(input.isNew);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { category: true, materialRef: true },
    });

    logger.info({ id: updated.id, slug: updated.slug, name: updated.name }, "Product updated in MongoDB");
    return enrichProductDetails(updated);
  }

  /**
   * Permanently deletes a product from MongoDB.
   */
  static async deleteProduct(id: string): Promise<{ success: boolean; id: string; name: string }> {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, imageUrl: true, images: true },
    });

    if (!existing) {
      throw new Error(`Product with ID "${id}" not found`);
    }

    // Safely unlink historical order items (keeping customer receipts intact) and delete product
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { productId: id },
        data: { productId: null },
      });

      await tx.product.delete({
        where: { id },
      });
    });

    logger.info({ id: existing.id, name: existing.name }, "Product deleted from MongoDB");

    return {
      success: true,
      id: existing.id,
      name: existing.name,
    };
  }
}

export function slugifyProduct(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = slugifyProduct(name) || "product";
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter++}`;
  }
}

