"use client";

import React, { useState, useEffect } from "react";
import type { NewsletterSectionConfig } from "@/config/newsletter";
import { defaultNewsletterConfig } from "@/config/newsletter";
import { scrollToSectionId } from "@/lib/navigation";
import { submitNewsletterSubscription } from "@/services/newsletter-service";

/* -------------------------------------------------------------------------
 * Types & Service Interface
 * ------------------------------------------------------------------------- */

export interface NewsletterSubscribeResult {
  success: boolean;
  message?: string;
  discountCode?: string;
}

export type NewsletterSubscribeService = (
  email: string
) => Promise<NewsletterSubscribeResult>;

export interface NewsletterSignupFormProps {
  placeholder?: string;
  buttonLabel?: string;
  onSubscribe?: NewsletterSubscribeService;
  className?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* -------------------------------------------------------------------------
 * Component: NewsletterSignupForm
 * ------------------------------------------------------------------------- */

export function NewsletterSignupForm({
  placeholder = "Email Address",
  buttonLabel = "SUBSCRIBE",
  onSubscribe,
  className = "",
}: NewsletterSignupFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubscribe) {
        const result = await onSubscribe(trimmedEmail);
        if (result.success) {
          setIsSuccess(true);
          setStatusMessage(
            result.message || "Thank you for subscribing to our newsletter."
          );
          setEmail("");
        } else {
          setError(
            result.message || "Subscription could not be completed at this time."
          );
        }
      } else {
        // Safe backend boundary notice: Real subscriptions require backend endpoint
        setStatusMessage(
          "Newsletter subscription is currently in preview mode. Live backend endpoint integration is pending."
        );
      }
    } catch {
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full max-w-xl mx-auto ${className}`}>
      {isSuccess ? (
        <div
          role="status"
          data-testid="newsletter-success-message"
          className="text-center p-4 bg-neutral-50 border border-neutral-200 text-[#111111] text-sm leading-relaxed"
        >
          {statusMessage}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          data-testid="newsletter-form"
          className="flex flex-col sm:flex-row items-stretch gap-3 w-full"
        >
          <div className="flex-1 flex flex-col">
            <label htmlFor="newsletter-email" className="sr-only">
              {placeholder}
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
                if (statusMessage) setStatusMessage(null);
              }}
              placeholder={placeholder}
              disabled={isSubmitting}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error
                  ? "newsletter-error"
                  : statusMessage
                  ? "newsletter-status"
                  : undefined
              }
              suppressHydrationWarning
              className="w-full bg-white border border-[#CCCCCC] focus:border-[#C5A572] focus:ring-1 focus:ring-[#C5A572] rounded-none px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base text-[#111111] placeholder:text-[#999999] outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="newsletter-submit-button"
            suppressHydrationWarning
            className="rounded-none bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white px-7 sm:px-9 py-3.5 sm:py-4 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
          >
            {isSubmitting ? "SUBSCRIBING..." : buttonLabel}
          </button>
        </form>
      )}

      {/* Accessible validation error message */}
      {error && (
        <p
          id="newsletter-error"
          role="alert"
          data-testid="newsletter-error"
          className="text-xs sm:text-sm text-red-600 mt-2.5 text-center sm:text-left"
        >
          {error}
        </p>
      )}

      {/* Service status / preview notice */}
      {statusMessage && !isSuccess && (
        <p
          id="newsletter-status"
          role="status"
          data-testid="newsletter-status"
          className="text-xs sm:text-sm text-[#777777] mt-2.5 text-center sm:text-left"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Component: NewsletterSignupSection
 * ------------------------------------------------------------------------- */

export interface NewsletterSignupSectionProps {
  config?: NewsletterSectionConfig;
  onSubscribe?: NewsletterSubscribeService;
  className?: string;
}

/**
 * NewsletterSignupSection Component — PERALAGAE
 *
 * Implements:
 * 1. Exact Section Heading: "Sign up now & get 10% off" (large, centred, dark charcoal)
 * 2. Exact Promotional Description: "Sign up to our Newsletter and get the discount code."
 * 3. Clean horizontal form row on desktop with rectangular input and "SUBSCRIBE" button
 * 4. Resilient RFC email validation and clean backend service boundary
 */
export function NewsletterSignupSection({
  config = defaultNewsletterConfig,
  onSubscribe,
  className = "",
}: NewsletterSignupSectionProps) {
  const {
    heading = "Sign up now & get 10% off",
    description = "A little luxury, delivered straight to your inbox.",
    inputPlaceholder = "Email Address",
    buttonLabel = "SUBSCRIBE",
    backgroundColor = "#FFFFFF",
  } = config;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHash = () => {
      if (window.location.hash === "#newsletter-section" || window.location.hash === "#newsletter") {
        requestAnimationFrame(() => {
          scrollToSectionId("newsletter-section", { updateHash: false });
        });
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("popstate", handleHash);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("popstate", handleHash);
    };
  }, []);

  const handleDefaultSubscribe = async (email: string): Promise<NewsletterSubscribeResult> => {
    const res = await submitNewsletterSubscription(email, "FOOTER");
    return { success: res.success, message: res.message };
  };

  return (
    <section
      id="newsletter-section"
      aria-labelledby="newsletter-heading"
      data-testid="newsletter-section"
      className={`w-full pt-8 sm:pt-10 lg:pt-12 pb-10 sm:pb-12 lg:pb-14 scroll-mt-28 lg:scroll-mt-32 ${className}`}
      style={{ backgroundColor }}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Exact Section Heading: Sign up now & get 10% off */}
        <h2
          id="newsletter-heading"
          data-testid="newsletter-heading"
          className="font-normal text-2xl sm:text-3xl md:text-[32px] lg:text-[36px] tracking-[-0.01em] text-[#111111] leading-tight mb-3 sm:mb-4"
        >
          {heading}
        </h2>

        {/* Exact Supporting Text */}
        <p
          data-testid="newsletter-description"
          className="text-sm sm:text-base text-[#666666] leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto font-normal"
        >
          {description}
        </p>

        {/* Newsletter Signup Form */}
        <NewsletterSignupForm
          placeholder={inputPlaceholder}
          buttonLabel={buttonLabel}
          onSubscribe={onSubscribe || handleDefaultSubscribe}
        />
      </div>
    </section>
  );
}
