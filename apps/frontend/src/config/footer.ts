/**
 * Footer Configuration — PERALAGAE
 *
 * Configuration-driven architecture for the five-column luxury footer.
 * Faithfully mirrors the reference proportions and layout:
 * - Column 1: PERALAGAE brand wordmark & tagline
 * - Column 2: Explore Peralagae (Shop Our Collections, New Arrivals, Necklaces, Rings, Bracelets, Earrings)
 * - Column 3: Shopping & More (Charms & Bangles, Gift Ideas, Find Store, Services, Subscribe)
 * - Column 4: Store Details (Need Any Help?, phone, address, email)
 * - Column 5: Follow Us (social links)
 * - Divider line
 * - Payment method logos row (Maestro, PayPal, Visa, MasterCard)
 * - Centered copyright text: © 2026 PERALAGAE. All Rights Reserved.
 * - Bottom-right back-to-top button
 */

export interface FooterLinkItem {
  id: string;
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface FooterColumnConfig {
  id: string;
  title: string;
  links: FooterLinkItem[];
}

export interface StoreDetailsConfig {
  title: string;
  helpLabel: string;
  phone: string;
  phoneHref?: string;
  address: string;
  email: string;
}

export interface SocialLinkItem {
  id: string;
  platform: "facebook" | "twitter" | "pinterest" | "instagram";
  label: string;
  href: string;
}

export interface FollowUsConfig {
  title: string;
  links: SocialLinkItem[];
}

export interface PaymentMethodItem {
  id: string;
  name: string;
}

export interface FooterConfig {
  brand: {
    name: string;
    tagline: string;
    href: string;
    logoSrc?: string;
    logoWidth?: number;
    logoHeight?: number;
  };
  explorePeralagae: FooterColumnConfig;
  /** Backwards-compatible alias for explorePeralagae */
  exploreJavix?: FooterColumnConfig;
  shoppingAndMore: FooterColumnConfig;
  storeDetails: StoreDetailsConfig;
  followUs: FollowUsConfig;
  copyright: {
    year: number;
    brandName: string;
    rightsText: string;
  };
  developer?: {
    text: string;
    label: string;
    href: string;
  };
  backToTop?: {
    enabled?: boolean;
    label?: string;
  };
  paymentMethods?: PaymentMethodItem[];
}

const explorePeralagaeColumn: FooterColumnConfig = {
  id: "explore-peralagae",
  title: "Explore Peralagae",
  links: [
    { id: "explore-collections", label: "Shop Our Collections", href: "/#shop-our-collections" },
    { id: "explore-new-arrivals", label: "New Arrivals", href: "/#new-collection" },
    { id: "explore-necklaces", label: "Necklaces", href: "/#shop-our-collections" },
    { id: "explore-rings", label: "Rings", href: "/#shop-our-collections" },
    { id: "explore-bracelets", label: "Bracelets", href: "/#shop-our-collections" },
    { id: "explore-earrings", label: "Earrings", href: "/#shop-our-collections" },
  ],
};

export const defaultFooterConfig: FooterConfig = {
  brand: {
    name: "PERALAGAE",
    tagline: "Designed in India. Crafted with timeless elegance.",
    href: "/",
    logoSrc: "/images/logo/peralagae-logo.png",
    logoWidth: 1308,
    logoHeight: 537,
  },
  explorePeralagae: explorePeralagaeColumn,
  exploreJavix: explorePeralagaeColumn,
  shoppingAndMore: {
    id: "shopping-and-more",
    title: "Shopping & More",
    links: [
      { id: "shopping-charms", label: "Charms & Bangles", href: "/#shop-our-collections" },
      { id: "shopping-gift-ideas", label: "Gift Ideas", href: "/#shop-our-collections" },
      { id: "shopping-find-store", label: "Find Store", href: "/#store-locator" },
      { id: "shopping-services", label: "Services", href: "/#store-locator" },
      { id: "shopping-subscribe", label: "Subscribe", href: "/#newsletter-section" },
    ],
  },
  storeDetails: {
    title: "Store Details",
    helpLabel: "Need Any Help?",
    phone: "123 45678 90",
    phoneHref: "tel:+11234567890",
    address: "502 New Design Str, Melbourne, Australia",
    email: "contact@peralagae.com",
  },
  followUs: {
    title: "Follow Us",
    links: [
      { id: "instagram", platform: "instagram", label: "Instagram", href: "https://instagram.com" },
    ],
  },
  copyright: {
    year: 2026,
    brandName: "PERALAGAE",
    rightsText: "All Rights Reserved.",
  },
  backToTop: {
    enabled: false,
    label: "Back to top",
  },
  paymentMethods: [],
};
