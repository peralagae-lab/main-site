/**
 * Newsletter Service & Validation Boundary — PERALAGAE
 *
 * Handles client-side email validation and modular backend newsletter
 * subscription submissions.
 */

import { API_BASE_URL } from "@/lib/api-client";

export interface NewsletterSubscriptionResult {
  success: boolean;
  status: "success" | "error" | "unconfigured";
  message: string;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates newsletter email address with concise inline feedback.
 */
export function validateNewsletterEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Please enter your email address.";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return null;
}

/**
 * Submits newsletter subscription to the configured API endpoint.
 * Defaults to the PERALAGAE backend API route (/api/v1/newsletter/subscribe).
 */
export async function submitNewsletterSubscription(
  email: string,
  source: string = "POPUP"
): Promise<NewsletterSubscriptionResult> {
  const trimmed = email.trim();
  const validationError = validateNewsletterEmail(trimmed);
  if (validationError) {
    return {
      success: false,
      status: "error",
      message: validationError,
    };
  }

  const endpoint =
    process.env.NEXT_PUBLIC_NEWSLETTER_API_URL ||
    (!process.env.VITEST ? `${API_BASE_URL}/newsletter/subscribe` : undefined);

  if (!endpoint) {
    return {
      success: false,
      status: "unconfigured",
      message:
        "Newsletter subscription service is currently awaiting backend provider configuration (NEXT_PUBLIC_NEWSLETTER_API_URL).",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: trimmed, source }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: "error",
        message:
          errorData?.error?.message ||
          errorData?.message ||
          "Subscription could not be completed at this time. Please try again later.",
      };
    }

    const data = await response.json().catch(() => null);
    return {
      success: true,
      status: "success",
      message: data?.message || "Thank you for joining the PERALAGAE Circle.",
    };
  } catch {
    return {
      success: false,
      status: "error",
      message: "An unexpected network error occurred. Please check your connection and try again.",
    };
  }
}
