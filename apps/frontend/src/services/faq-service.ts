import { getBackendOrigin } from "@/lib/api-client";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetches active FAQs from the production database API.
 * Returns a maximum of 5 active questions.
 * If none exist or on network failure, returns an empty array.
 */
export async function fetchPublicFaqs(): Promise<FaqItem[]> {
  try {
    const isServer = typeof window === "undefined";
    const hasWindowOrigin =
      typeof window !== "undefined" &&
      Boolean(window.location?.origin && window.location.origin !== "null");
    const baseUrl = isServer || !hasWindowOrigin ? getBackendOrigin() : "";
    const url = `${baseUrl}/api/v1/faqs`;

    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return [];
    }

    const payload = await res.json();
    if (payload && Array.isArray(payload.data)) {
      // Enforce maximum 5 questions
      return payload.data.slice(0, 5);
    }

    return [];
  } catch {
    return [];
  }
}
