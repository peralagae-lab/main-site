/**
 * Navigation & In-Page Section Scroll Utility — PERALAGAE
 *
 * Provides robust, route-aware section navigation and smooth scrolling
 * with sticky header compensation, reduced-motion compliance,
 * and lock state to prevent scroll-spy race conditions.
 */

// Global flag to track programmatic scrolling and prevent scroll listeners from wiping hashes
let isProgrammaticScroll = false;
let programmaticTimer: NodeJS.Timeout | null = null;

export function setProgrammaticScrollActive(durationMs = 1000): void {
  isProgrammaticScroll = true;
  if (typeof window !== "undefined") {
    (window as unknown as { __PERALAGAE_SCROLL_LOCK?: boolean }).__PERALAGAE_SCROLL_LOCK = true;
  }
  if (programmaticTimer) clearTimeout(programmaticTimer);
  programmaticTimer = setTimeout(() => {
    isProgrammaticScroll = false;
    if (typeof window !== "undefined") {
      (window as unknown as { __PERALAGAE_SCROLL_LOCK?: boolean }).__PERALAGAE_SCROLL_LOCK = false;
    }
    programmaticTimer = null;
  }, durationMs);
}

export function isProgrammaticScrollActive(): boolean {
  if (typeof window !== "undefined") {
    if ((window as unknown as { __PERALAGAE_SCROLL_LOCK?: boolean }).__PERALAGAE_SCROLL_LOCK) {
      return true;
    }
  }
  return isProgrammaticScroll;
}

/**
 * Calculates the actual sticky/fixed header offset height so section headings
 * remain fully visible below the header on desktop, tablet, and mobile.
 */
export function getStickyHeaderOffset(): number {
  if (typeof window === "undefined") return 24;

  const header =
    document.querySelector("header[role='banner']") ||
    document.querySelector("header");

  if (header && typeof window.getComputedStyle === "function") {
    const style = window.getComputedStyle(header);
    if (style.position === "fixed" || style.position === "sticky") {
      const rect = header.getBoundingClientRect();
      return Math.max(Math.round(rect.height), 80) + 16;
    }
  }

  return 24;
}

/**
 * Resolves an element ID with alias support (e.g. #new-arrivals vs #new-collection).
 */
export function findSectionElement(targetId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;

  const cleanId = targetId.replace(/^[/#]+/, "");
  if (!cleanId) return null;

  // Direct ID check
  let element = document.getElementById(cleanId);
  if (element) return element;

  // Alias lookups
  if (cleanId === "new-arrivals" || cleanId === "new-collection") {
    element = document.getElementById("new-arrivals") || document.getElementById("new-collection");
    if (element) return element;
  }

  if (cleanId === "store-locator" || cleanId === "find-store") {
    element = document.getElementById("store-locator");
    if (element) return element;
  }

  if (cleanId === "newsletter-section" || cleanId === "newsletter") {
    element = document.getElementById("newsletter-section");
    if (element) return element;
  }

  if (cleanId === "shop-our-collections" || cleanId === "collections") {
    element = document.getElementById("shop-our-collections");
    if (element) return element;
  }

  if (cleanId === "faqs" || cleanId === "faq") {
    element = document.getElementById("faqs") || document.getElementById("faq");
    if (element) return element;
  }

  return null;
}

export interface ScrollToSectionOptions {
  updateHash?: boolean;
  behavior?: ScrollBehavior;
  offset?: number;
}

/**
 * Smoothly scrolls to a section target element with sticky header offset compensation.
 * Returns true if the target element was found and scrolled to, false otherwise.
 */
export function scrollToSectionId(
  targetId: string,
  options: ScrollToSectionOptions = {}
): boolean {
  if (typeof window === "undefined") return false;

  const cleanId = targetId.replace(/^[/#]+/, "");
  const element = findSectionElement(cleanId);

  if (!element) return false;

  setProgrammaticScrollActive(1000);

  const prefersReduced =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const behavior = options.behavior ?? (prefersReduced ? "auto" : "smooth");
  const headerOffset = options.offset ?? getStickyHeaderOffset();

  // If element.scrollIntoView is mocked or available, call it
  if (typeof element.scrollIntoView === "function") {
    try {
      element.scrollIntoView({ behavior });
    } catch {
      // ignore
    }
  }

  // Also apply precise sticky header offset adjustment via window.scrollTo
  if (typeof window.scrollTo === "function") {
    const elementRect = element.getBoundingClientRect();
    const targetTop = window.scrollY + elementRect.top - headerOffset;

    window.scrollTo({
      top: Math.max(0, Math.round(targetTop)),
      behavior,
    });
  }

  if (options.updateHash !== false) {
    const targetHash = `#${cleanId}`;
    if (window.location.hash !== targetHash) {
      if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState(
          window.history.state,
          "",
          `${window.location.pathname}${targetHash}`
        );
      }
      try {
        if (typeof HashChangeEvent !== "undefined") {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } else {
          window.dispatchEvent(new Event("hashchange"));
        }
      } catch {
        window.dispatchEvent(new Event("hashchange"));
      }
    }
  }

  return true;
}

/**
 * Smoothly scrolls to top of the page and clears URL hash.
 */
export function scrollToTop(options: { clearHash?: boolean; behavior?: ScrollBehavior } = {}): void {
  if (typeof window === "undefined") return;

  setProgrammaticScrollActive(800);

  const prefersReduced =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const behavior = options.behavior ?? (prefersReduced ? "auto" : "smooth");

  if (typeof window.scrollTo === "function") {
    window.scrollTo({
      top: 0,
      behavior,
    });
  }

  if (options.clearHash !== false && window.location.hash) {
    if (window.history && typeof window.history.pushState === "function") {
      window.history.pushState(window.history.state, "", window.location.pathname);
    }
    try {
      if (typeof HashChangeEvent !== "undefined") {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.dispatchEvent(new Event("hashchange"));
      }
    } catch {
      window.dispatchEvent(new Event("hashchange"));
    }
  }
}

