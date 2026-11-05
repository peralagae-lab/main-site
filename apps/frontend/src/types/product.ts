/**
 * Product Data Model — PERALAGAE
 *
 * Defines strongly-typed product schemas used across product cards,
 * carousels, quick-view dialogs, cart, and wishlist operations.
 */

export interface ProductImage {
  /** Public asset path or URL */
  src: string;
  /** Descriptive alternative text for accessibility */
  alt: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number; // 1 to 5
  date: string;
  comment: string;
  verified?: boolean;
  avatar?: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  /** Stable unique product identifier */
  id: string;
  /** URL slug */
  slug: string;
  /** Display title of the fine jewellery item */
  name: string;
  /** Product category label (e.g. "NECKLACES", "RINGS", "BRACELETS", "EARRINGS", "CHARMS & BANGLES", "GIFT IDEAS") */
  category: string;
  categoryKey?: string;
  categoryId?: string | null;
  /** Optional subcategory (e.g. "Pendants", "Solitaires", "Bangles", "Studs") */
  subcategory?: string;
  /** Collection grouping (e.g. "Solitaire Radiance", "Heritage Gold", "Modern Classics") */
  collection?: string;
  /** Stock keeping unit / internal reference */
  sku?: string;
  /** High-resolution primary product imagery */
  image: ProductImage;
  /** Optional multi-view gallery imagery (main, lifestyle, angle, macro) */
  images?: ProductImage[];
  /** Numeric price in Indian Rupees (INR) */
  priceInr: number;
  /** Optional formatted price string in Indian Rupees (e.g. "₹24,900") */
  priceDisplay?: string;
  /** Optional original compare-at price in INR (for discounted items) */
  compareAtPriceInr?: number;
  /** Whether product qualifies for "NEW" badge */
  isNew?: boolean;
  /** Whether product qualifies for "HOT" badge */
  isHot?: boolean;
  /** Inventory availability status */
  isAvailable?: boolean;
  /** In-stock status */
  inStock?: boolean;
  /** Inventory stock quantity count */
  stockCount?: number;
  /** Detailed description for quick-view and product detail displays */
  description?: string;
  productOverview?: string;
  productDetails?: string;
  careInstructions?: string;
  additionalInfo?: string;
  descriptionParagraph1?: string;
  descriptionParagraph2?: string;
  /** Editorial in-depth story / description for the Description tab */
  longDescription?: string;
  /** Primary database-backed material ID */
  materialId?: string | null;
  /** Material reference entity */
  materialRef?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  /** Precious metal / gemstone material specification */
  material?: string;
  /** Categorized material tags (e.g. ["Gold", "Diamond", "Platinum", "Silver", "Rose Gold"]) */
  materials?: string[];
  /** Structured specifications (Metal & Purity, Gemstone, Certification, Weight, Dimensions, Care) */
  specs?: ProductSpec[];
  /** Aggregate customer rating (1.0 to 5.0) */
  rating?: number;
  /** Total verified customer review count */
  reviewCount?: number;
  /** Active concurrent viewers count */
  viewersCount?: number;
  /** List of customer reviews */
  reviews?: ProductReview[];
  /** Creation ISO date for 'Newest First' sorting */
  createdAt?: string;
  /** Last updated ISO date */
  updatedAt?: string;
}
