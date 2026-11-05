/**
 * Search Service & Relevance Engine — PERALAGAE
 *
 * Implements a weighted relevance scoring algorithm across the actual
 * fine jewellery catalogue (SHOP_PRODUCTS).
 *
 * Relevance hierarchy matching requirements:
 * 1. Exact product name match (Score: 1000)
 * 2. Product name begins with query (Score: 500)
 * 3. Partial product name matches containing all or some query tokens (Score: 300 / 80)
 * 4. Category matches (e.g. "rings", "necklaces", "bracelets", "earrings") (Score: 400 / 150)
 * 5. Precious metal & gemstone material matches (e.g. "gold", "diamond", "platinum") (Score: 200 / 100)
 * 6. Product description and SKU keywords (Score: 50)
 */

import type { Product } from "@/types/product";
import { fetchPublicProducts } from "@/services/product-service";

export interface SearchResult {
  products: Product[];
  totalMatches: number;
  query: string;
}

export const SUGGESTED_SEARCHES = [
  "Rings",
  "Necklaces",
  "Bracelets",
  "Earrings",
] as const;

/**
 * Normalizes category queries to match singular/plural forms
 */
function normalizeCategoryToken(token: string): string[] {
  const t = token.toLowerCase();
  const variations = [t];

  if (t === "ring" || t === "rings") variations.push("ring", "rings");
  if (t === "necklace" || t === "necklaces") variations.push("necklace", "necklaces");
  if (t === "bracelet" || t === "bracelets") variations.push("bracelet", "bracelets");
  if (t === "earring" || t === "earrings") variations.push("earring", "earrings");
  if (t === "bangle" || t === "bangles") variations.push("bangle", "bangles", "charms & bangles");
  if (t === "charm" || t === "charms") variations.push("charm", "charms", "charms & bangles");
  if (t === "gift" || t === "gifts") variations.push("gift", "gifts", "gift ideas");

  return Array.from(new Set(variations));
}

/**
 * Compute relevance score for a product given a sanitized query and its tokens.
 */
function computeProductScore(product: Product, rawQuery: string, tokens: string[]): number {
  const query = rawQuery.toLowerCase();
  const name = product.name.toLowerCase();
  const category = product.category.toLowerCase();
  const material = (product.material || "").toLowerCase();
  const materials = (product.materials || []).map((m) => m.toLowerCase());
  const description = (product.description || "").toLowerCase();
  const sku = (product.id || "").toLowerCase();
  const slug = (product.slug || "").toLowerCase();

  let score = 0;

  // 1. Exact Name match
  if (name === query) {
    score += 1000;
  }
  // 2. Name starts with query
  else if (name.startsWith(query)) {
    score += 500;
  }

  // 3. Tokens in Product Name
  const allTokensInName = tokens.every((tok) => name.includes(tok));
  if (allTokensInName) {
    score += 300;
  }
  tokens.forEach((tok) => {
    if (name.includes(tok)) {
      score += 80;
    }
  });

  // 4. Category matches
  const categoryTokens = tokens.flatMap(normalizeCategoryToken);
  const directCategoryMatch = categoryTokens.some(
    (ct) => category === ct || category.includes(ct)
  );
  if (directCategoryMatch) {
    score += 400;
  }
  tokens.forEach((tok) => {
    if (category.includes(tok)) {
      score += 150;
    }
  });

  // 5. Material matches (precious metal / gemstone)
  if (material.includes(query) || materials.some((m) => m === query)) {
    score += 200;
  }
  tokens.forEach((tok) => {
    if (material.includes(tok) || materials.some((m) => m.includes(tok))) {
      score += 100;
    }
  });

  // 6. Keywords in description, slug, SKU
  if (description.includes(query) || slug.includes(query) || sku.includes(query)) {
    score += 50;
  }
  tokens.forEach((tok) => {
    if (description.includes(tok) || slug.includes(tok) || sku.includes(tok)) {
      score += 20;
    }
  });

  return score;
}

/**
 * Searches the fine jewellery catalogue and returns ranked, deduplicated results.
 *
 * @param query Search keyword(s) entered by the user
 * @param catalogue Optional catalogue override (defaults to real SHOP_PRODUCTS)
 * @param limit Maximum results to return for the overlay (defaults to 8)
 */
export function searchCatalogue(
  query: string,
  catalogue: Product[] = [],
  limit = 6
): SearchResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      products: [],
      totalMatches: 0,
      query: "",
    };
  }

  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return {
      products: [],
      totalMatches: 0,
      query: trimmed,
    };
  }

  // Compute scores and filter only matching items
  const scoredItems: { product: Product; score: number }[] = [];

  for (const product of catalogue) {
    const score = computeProductScore(product, trimmed, tokens);
    if (score > 0) {
      scoredItems.push({ product, score });
    }
  }

  // Sort descending by score; break ties by hot/new badges, then catalogue order
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.product.isHot && !a.product.isHot) return -1;
    if (!b.product.isHot && a.product.isHot) return 1;
    if (b.product.isNew && !a.product.isNew) return -1;
    if (!b.product.isNew && a.product.isNew) return 1;
    return a.product.priceInr - b.product.priceInr;
  });

  // Deduplicate products by ID
  const seenIds = new Set<string>();
  const uniqueProducts: Product[] = [];

  for (const item of scoredItems) {
    if (!seenIds.has(item.product.id)) {
      seenIds.add(item.product.id);
      uniqueProducts.push(item.product);
    }
  }

  return {
    products: uniqueProducts.slice(0, limit),
    totalMatches: uniqueProducts.length,
    query: trimmed,
  };
}

/**
 * Asynchronously searches products via the MongoDB database API.
 */
export async function searchProducts(
  query: string,
  limit = 6
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { products: [], totalMatches: 0, query: "" };
  }

  try {
    const res = await fetchPublicProducts({ search: trimmed }, "default", 1, limit);
    if (res && res.products) {
      return {
        products: res.products,
        totalMatches: res.total,
        query: trimmed,
      };
    }
  } catch (err) {
    console.warn("[searchProducts] Database search error:", err);
  }

  return { products: [], totalMatches: 0, query: trimmed };
}
