/**
 * Navigation & Header Configuration — PERALAGAE
 *
 * Configuration-driven architecture allowing easy future integration
 * with backend content management systems or dynamic tenant configurations
 * without rebuilding the UI components.
 */

export interface AnnouncementConfig {
  /** The promotional announcement text */
  text: string;
  /** Background hex color code */
  backgroundColor: string;
  /** Foreground text hex color code */
  textColor: string;
  /** Whether the announcement can be dismissed by the user */
  dismissible: boolean;
  /** Whether the announcement is currently loading from the database */
  isLoading?: boolean;
}

export interface UtilityPromotionConfig {
  text: string;
  linkText?: string;
  href?: string;
  isLoading?: boolean;
}

export interface UtilityLinkItem {
  id: string;
  label: string;
  href?: string;
  isImplemented: boolean;
}

export interface UtilityConfig {
  phone?: string;
  phoneHref?: string;
  language?: string;
  currency?: string;
  currencySymbol?: string;
  promotion: UtilityPromotionConfig;
  links: UtilityLinkItem[];
  showPhone?: boolean;
  showPromotion?: boolean;
  showLinks?: boolean;
}

export interface BrandConfig {
  name: string;
  href: string;
  logoSrc?: string;
  logoWidth?: number;
  logoHeight?: number;
}

export interface PrimaryNavItem {
  id: string;
  label: string;
  href: string;
  /** Whether the route destination is currently implemented in the frontend */
  isImplemented: boolean;
}

export type ActionIconType = "search" | "account" | "wishlist" | "cart";

export interface ActionItem {
  id: ActionIconType;
  label: string;
  href?: string;
  /** Whether this action has a concrete route or modal implemented */
  isImplemented: boolean;
}

export interface BadgesConfig {
  cartCount: number;
  wishlistCount: number;
}

export interface CategoryItem {
  id: string;
  label: string;
  href: string;
}

export interface NavigationConfig {
  announcement: AnnouncementConfig;
  utility: UtilityConfig;
  brand: BrandConfig;
  primaryNav: PrimaryNavItem[];
  categories?: CategoryItem[];
  actions: ActionItem[];
  badges: BadgesConfig;
}

/**
 * Default PERALAGAE navigation configuration.
 * Faithfully mirrors the reference proportions, typography, and items.
 */
export const defaultNavigationConfig: NavigationConfig = {
  announcement: {
    text: "",
    backgroundColor: "#FBC0CE",
    textColor: "#222222",
    dismissible: true,
  },
  utility: {
    phone: "+91 98765 43210",
    phoneHref: "tel:+919876543210",
    language: "English",
    currency: "Rupees (INR)",
    currencySymbol: "₹",
    promotion: {
      text: "",
      linkText: "Shop Now!",
      href: "/shop",
    },
    links: [
      {
        id: "find-store",
        label: "Find a Store",
        href: "/#store-locator",
        isImplemented: true,
      },
      { id: "faqs", label: "FAQs", href: "/faq", isImplemented: true },
      { id: "subscribe", label: "Subscribe", href: "/#newsletter-section", isImplemented: true },
    ],
  },
  brand: {
    name: "PERALAGAE",
    href: "/",
    logoSrc: "/images/logo/peralagae-logo.png",
    logoWidth: 1308,
    logoHeight: 537,
  },
  primaryNav: [
    { id: "home", label: "Home", href: "/", isImplemented: true },
    { id: "shop", label: "Shop", href: "/shop", isImplemented: true },
    { id: "contact", label: "Contact", href: "/contact", isImplemented: true },
    { id: "new-arrivals", label: "New Arrivals", href: "/#new-arrivals", isImplemented: true },
  ],
  categories: [
    { id: "new-products", label: "New Products", href: "/shop?filter=new" },
    { id: "today-on-sale", label: "Today On Sale", href: "/shop?filter=sale" },
    { id: "special-offer", label: "Special Offer!", href: "/shop?filter=special" },
    { id: "necklaces", label: "Necklaces", href: "/shop?category=necklaces" },
    { id: "rings", label: "Rings", href: "/shop?category=rings" },
    { id: "bracelets", label: "Bracelets", href: "/shop?category=bracelets" },
    { id: "earrings", label: "Earnings", href: "/shop?category=earrings" },
    { id: "charm-dangles", label: "Charm & Dangles", href: "/shop?category=charms-bangles" },
    { id: "watches", label: "Watches", href: "/shop" },
    { id: "gift-ideas", label: "Gift Ideas", href: "/shop?category=gift-ideas" },
  ],
  actions: [
    { id: "search", label: "Search", isImplemented: false },
    { id: "account", label: "Account", href: "/account", isImplemented: false },
    { id: "wishlist", label: "Wishlist", href: "/wishlist", isImplemented: true },
    { id: "cart", label: "Cart", href: "/cart", isImplemented: true },
  ],
  badges: {
    cartCount: 0,
    wishlistCount: 0,
  },
};
