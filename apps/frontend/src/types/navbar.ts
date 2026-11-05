export interface TopBarConfig {
  text: string;
  backgroundColor: string;
  textColor: string;
  visible: boolean;
  dismissible: boolean;
}

export interface SecondNavbarLinkItem {
  id: string;
  label: string;
  href: string;
  isImplemented: boolean;
}

export interface SecondNavbarConfig {
  phone: string;
  phoneHref: string;
  promoText: string;
  ctaText: string;
  ctaHref: string;
  links: SecondNavbarLinkItem[];
  showPhone: boolean;
  showPromotion: boolean;
  showLinks: boolean;
}

export interface NavbarSettingsData {
  id: string;
  topBar: TopBarConfig;
  secondNavbar: SecondNavbarConfig;
  version: number;
  topBarVersion?: number;
  secondNavbarVersion?: number;
  updatedAt: string;
  updatedBy: string;
}

export interface NavbarHistoryItem {
  id: string;
  section: "TOP_BAR" | "SECOND_NAVBAR" | "top_bar" | "second_navbar" | "full";
  snapshot: NavbarSettingsData;
  description: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

export const defaultNavbarSettingsData: NavbarSettingsData = {
  id: "current",
  topBar: {
    text: "",
    backgroundColor: "#FBC0CE",
    textColor: "#222222",
    visible: true,
    dismissible: true,
  },
  secondNavbar: {
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
        href: "/faq",
        isImplemented: true,
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
  },
  version: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "system",
};
