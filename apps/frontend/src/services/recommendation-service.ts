/**
 * Recommendation Service — PERALAGAE
 *
 * Implements deterministic, priority-based product recommendation logic
 * for the Cart Page ("You May Be Interested In...").
 *
 * Recommendation Hierarchy:
 * Priority 1: Same category as items in the customer's cart
 * Priority 2: Closely related jewellery categories
 * Priority 3: Matching attributes (materials, price tier)
 * Exclusions: Products already in cart, out-of-stock items, duplicates
 * Fallback: Curated catalogue items if cart is empty or pool is small
 */

import type { Product } from "@/types/product";
import type { CartItem } from "@/providers/storefront-provider";

/**
 * Related category mapping based on classic fine jewellery pairings.
 */
export const RELATED_CATEGORIES_MAP: Record<string, string[]> = {
  rings: ["bracelets", "earrings", "necklaces"],
  earrings: ["necklaces", "bracelets", "rings"],
  necklaces: ["earrings", "charms-bangles", "bracelets", "rings"],
  bracelets: ["rings", "charms-bangles", "necklaces", "earrings"],
  "charms-bangles": ["bracelets", "necklaces", "rings"],
  "gift-ideas": ["necklaces", "rings", "earrings", "bracelets"],
};

export interface RecommendationOptions {
  /** Maximum number of recommendations to return (defaults to 4) */
  limit?: number;
  /** Custom catalogue source for testing or API injection */
  catalogue?: Product[];
}

/**
 * Normalize category string for robust matching (e.g. 'RINGS' -> 'rings')
 */
function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  if (lower.includes("ring")) return "rings";
  if (lower.includes("earring")) return "earrings";
  if (lower.includes("necklace")) return "necklaces";
  if (lower.includes("bracelet")) return "bracelets";
  if (lower.includes("charm") || lower.includes("bangle")) return "charms-bangles";
  if (lower.includes("gift")) return "gift-ideas";
  return lower;
}

/**
 * Compute deterministic recommendations based on current cart items.
 */
export function getRecommendedProducts(
  cartItems: CartItem[],
  options: RecommendationOptions = {}
): Product[] {
  const { limit = 4, catalogue = [] } = options;

  // 1. Build exclusion set from active cart item IDs
  const cartProductIds = new Set(cartItems.map((item) => item.product.id));

  // 2. Filter candidates: exclude cart items and out-of-stock items
  const eligibleCandidates = catalogue.filter(
    (product) => !cartProductIds.has(product.id) && product.inStock !== false
  );

  if (eligibleCandidates.length === 0) {
    return [];
  }

  // 3. Fallback for Empty Cart: Return top curated items from catalogue
  if (cartItems.length === 0) {
    // Return first `limit` items (curated default set)
    return eligibleCandidates.slice(0, limit);
  }

  // 4. Extract cart metadata for scoring
  const cartCategories = new Set<string>();
  const cartMaterials = new Set<string>();
  let totalCartPrice = 0;
  let totalCartQty = 0;

  for (const item of cartItems) {
    cartCategories.add(normalizeCategory(item.product.category));
    if (item.product.materials) {
      for (const mat of item.product.materials) {
        cartMaterials.add(mat.toLowerCase());
      }
    }
    totalCartPrice += item.product.priceInr * item.quantity;
    totalCartQty += item.quantity;
  }

  const avgCartPrice = totalCartQty > 0 ? totalCartPrice / totalCartQty : 30000;

  // 5. Gather all related categories from the cart categories
  const relatedCategories = new Set<string>();
  for (const cat of cartCategories) {
    const related = RELATED_CATEGORIES_MAP[cat] || [];
    for (const r of related) {
      if (!cartCategories.has(r)) {
        relatedCategories.add(r);
      }
    }
  }

  // 6. Score each candidate deterministically
  interface ScoredCandidate {
    product: Product;
    score: number;
    originalIndex: number;
  }

  const scored: ScoredCandidate[] = eligibleCandidates.map((product, index) => {
    let score = 0;
    const prodCat = normalizeCategory(product.category);

    // Priority 1 — Same category (+100)
    if (cartCategories.has(prodCat)) {
      score += 100;
    }
    // Priority 2 — Related category (+50)
    else if (relatedCategories.has(prodCat)) {
      score += 50;
    }

    // Priority 3 — Similar attributes
    // Material match (+20 per match)
    if (product.materials && cartMaterials.size > 0) {
      for (const mat of product.materials) {
        if (cartMaterials.has(mat.toLowerCase())) {
          score += 20;
        }
      }
    }

    // Price tier similarity (+10 if within ±35% of average cart price)
    if (avgCartPrice > 0) {
      const priceDiffRatio = Math.abs(product.priceInr - avgCartPrice) / avgCartPrice;
      if (priceDiffRatio <= 0.35) {
        score += 10;
      }
    }

    // Featured / Hot / New bonus (+5)
    if (product.isHot || product.isNew) {
      score += 5;
    }

    return { product, score, originalIndex: index };
  });

  // 7. Sort deterministically:
  // Higher score first; if tied, preserve stable catalogue order (originalIndex)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.originalIndex - b.originalIndex;
  });

  // 8. Return top `limit` unique products
  return scored.slice(0, limit).map((s) => s.product);
}

export interface RelatedProductsOptions {
  /** Maximum number of related products (default: 4) */
  limit?: number;
  /** Custom catalogue source for testing or API injection */
  catalogue?: Product[];
}

/**
 * Category-Aware Recommendation Algorithm — PERALAGAE Product Detail Page
 *
 * Computes deterministic, ranked related jewellery items using:
 * 1. Subcategory match: +40 points
 * 2. Category match: +30 points
 * 3. Shared material / metal colour: +10 points per match
 * 4. Shared stone / style attributes: +5 points per match
 * 5. Same collection: +10 points
 * 6. Similar price tier (±35% of target price): +5 points
 *
 * Rules:
 * - Excludes current product (by ID)
 * - Excludes out-of-stock items (when inStock === false)
 * - Excludes duplicates
 * - Stable tie-breaker based on catalog order
 * - Deterministic, testable, backend-ready
 */
export function getRelatedProducts(
  currentProduct: Product,
  options: RelatedProductsOptions = {}
): Product[] {
  const { limit = 4, catalogue = [] } = options;

  // 1. Exclude the current product and unavailable items
  const eligibleCandidates = catalogue.filter(
    (product) =>
      product.id !== currentProduct.id &&
      product.inStock !== false &&
      product.stockCount !== 0 &&
      Boolean(product.image?.src)
  );

  if (eligibleCandidates.length === 0) {
    return [];
  }

  const currentCat = normalizeCategory(currentProduct.category);
  const currentSubcat = currentProduct.subcategory?.toLowerCase().trim();
  const currentCollection = currentProduct.collection?.toLowerCase().trim();
  const currentMaterials = new Set(
    (currentProduct.materials || []).map((m) => m.toLowerCase().trim())
  );
  if (currentProduct.material) {
    currentMaterials.add(currentProduct.material.toLowerCase().trim());
  }

  // Related complementary categories if pool needs backfill
  const complementaryCategories = new Set(RELATED_CATEGORIES_MAP[currentCat] || []);

  interface ScoredCandidate {
    product: Product;
    score: number;
    originalIndex: number;
  }

  const scored: ScoredCandidate[] = eligibleCandidates.map((product, index) => {
    let score = 0;
    const candCat = normalizeCategory(product.category);
    const candSubcat = product.subcategory?.toLowerCase().trim();
    const candCollection = product.collection?.toLowerCase().trim();

    // 1. Same Subcategory: +40 points
    if (currentSubcat && candSubcat && currentSubcat === candSubcat) {
      score += 40;
    }

    // 2. Category relevance: +30 points for same category; +15 for complementary jewellery category
    if (candCat === currentCat) {
      score += 30;
    } else if (complementaryCategories.has(candCat)) {
      score += 15;
    }

    // 3. Shared material or metal colour: +10 points per match
    if (product.materials && product.materials.length > 0) {
      for (const mat of product.materials) {
        if (currentMaterials.has(mat.toLowerCase().trim())) {
          score += 10;
        }
      }
    } else if (product.material && currentMaterials.has(product.material.toLowerCase().trim())) {
      score += 10;
    }

    // 4. Same Collection: +10 points
    if (currentCollection && candCollection && currentCollection === candCollection) {
      score += 10;
    }

    // 5. Shared stone / style / keyword attributes in name or description: +5 per match
    const keywords = ["diamond", "solitaire", "gold", "platinum", "emerald", "bangle", "tennis", "pave", "chain"];
    for (const kw of keywords) {
      const currentHas =
        currentProduct.name.toLowerCase().includes(kw) ||
        (currentProduct.description && currentProduct.description.toLowerCase().includes(kw));
      const candHas =
        product.name.toLowerCase().includes(kw) ||
        (product.description && product.description.toLowerCase().includes(kw));
      if (currentHas && candHas) {
        score += 5;
        break; // Count top matched attribute to prevent inflation
      }
    }

    // 6. Similar price range (within ±35%): +5 points
    if (currentProduct.priceInr > 0) {
      const priceRatio = Math.abs(product.priceInr - currentProduct.priceInr) / currentProduct.priceInr;
      if (priceRatio <= 0.35) {
        score += 5;
      }
    }

    // Hot or New items receive subtle tie-break interest bonus
    if (product.isHot) score += 2;
    if (product.isNew) score += 1;

    return { product, score, originalIndex: index };
  });

  // Sort deterministically: highest score first, stable catalogue index as tie-breaker
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.originalIndex - b.originalIndex;
  });

  // Return top unique products up to limit
  return scored.slice(0, limit).map((s) => s.product);
}

