"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check, Loader2 } from "lucide-react";
import { useStorefront } from "@/providers/storefront-provider";
import {
  validateNewsletterEmail,
  submitNewsletterSubscription,
  type NewsletterSubscriptionResult,
} from "@/services/newsletter-service";

export interface NewsletterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  autoOpenDelayMs?: number | null;
  onSubscribe?: (email: string) => Promise<NewsletterSubscriptionResult>;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function NewsletterPopup({
  isOpen,
  onClose,
  autoOpenDelayMs = 6000,
  onSubscribe,
  triggerRef,
}: NewsletterPopupProps) {
  const { openNewsletter, notify } = useStorefront();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openNewsletterRef = useRef(openNewsletter);

  useEffect(() => {
    openNewsletterRef.current = openNewsletter;
  }, [openNewsletter]);

  // 1. Automatic Opening 6 seconds after initial eligible load
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoOpenDelayMs == null || autoOpenDelayMs <= 0) return;

    try {
      const isSubscribed = localStorage.getItem("peralagae_newsletter_subscribed") === "true";
      const isDismissed = sessionStorage.getItem("peralagae_newsletter_dismissed") === "true";
      const isPermanentlyDismissed =
        localStorage.getItem("peralagae_newsletter_dismissed_permanently") === "true";

      if (isSubscribed || isDismissed || isPermanentlyDismissed) {
        return;
      }
    } catch {
      // Ignore private mode access errors
    }

    const timer = setTimeout(() => {
      try {
        const isSubscribed = localStorage.getItem("peralagae_newsletter_subscribed") === "true";
        const isDismissed = sessionStorage.getItem("peralagae_newsletter_dismissed") === "true";
        const isPermanentlyDismissed =
          localStorage.getItem("peralagae_newsletter_dismissed_permanently") === "true";
        if (!isSubscribed && !isDismissed && !isPermanentlyDismissed) {
          openNewsletterRef.current();
        }
      } catch {
        openNewsletterRef.current();
      }
    }, autoOpenDelayMs);

    return () => clearTimeout(timer);
  }, [autoOpenDelayMs]);

  // 2. Lock body scroll while popup is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // 3. Auto-focus email input after opening transition
  useEffect(() => {
    if (isOpen && !isSuccess) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSuccess]);

  // 4. Handle Close & Dismissal Persistence
  const handleClose = useCallback(() => {
    if (isSubmitting) return;

    try {
      sessionStorage.setItem("peralagae_newsletter_dismissed", "true");
      if (doNotShowAgain) {
        localStorage.setItem("peralagae_newsletter_dismissed_permanently", "true");
      }
    } catch {
      // Ignore
    }
    onClose();
    setTimeout(() => {
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
    }, 50);
  }, [isSubmitting, doNotShowAgain, onClose, triggerRef]);

  // 5. Escape Key Handling
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // 6. Handle Form Submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const validationError = validateNewsletterEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = onSubscribe
        ? await onSubscribe(email.trim())
        : await submitNewsletterSubscription(email.trim());

      if (result.success) {
        setIsSuccess(true);
        notify.success("Subscribed successfully!", {
          description: "Thank you for subscribing to PERALAGAE updates.",
        });
        try {
          localStorage.setItem("peralagae_newsletter_subscribed", "true");
        } catch {
          // Ignore
        }
      } else {
        setError(result.message);
        notify.error("Subscription failed", { description: result.message });
      }
    } catch {
      const msg = "An unexpected error occurred. Please try again later.";
      setError(msg);
      notify.error("Subscription failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDoNotShowAgain = (checked: boolean) => {
    setDoNotShowAgain(checked);
    try {
      if (checked) {
        localStorage.setItem("peralagae_newsletter_dismissed_permanently", "true");
      } else {
        localStorage.removeItem("peralagae_newsletter_dismissed_permanently");
      }
    } catch {
      // Ignore
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <Dialog.Portal>
        {/* Dark Translucent Overlay Behind Popup */}
        <Dialog.Overlay
          data-testid="newsletter-popup-backdrop"
          onClick={handleClose}
          className="newsletter-modal-backdrop fixed inset-0 z-50 bg-black/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Centered Modal Container */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <Dialog.Content
            data-testid="newsletter-popup-content"
            aria-labelledby="newsletter-popup-title"
            aria-describedby="newsletter-popup-description"
            className="newsletter-modal-content pointer-events-auto relative w-full max-w-[440px] flex flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl focus:outline-none"
          >
            {/* Minimalist Close Button in Upper-Right Corner */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="newsletter-popup-close-btn"
              aria-label="Close newsletter popup"
              className="absolute top-3 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 hover:bg-black/40 text-white backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Top Visual Banner — Full 4:3 Aspect Ratio Displaying Complete Model & Floral Diamond Earring */}
            <div className="relative w-full aspect-[4/3] max-h-[290px] sm:max-h-[330px] flex-none overflow-hidden bg-neutral-100">
              <Image
                src="/images/editorial/newsletter-banner.jpg"
                alt="PERALAGAE Fine Jewellery Collection"
                fill
                priority
                sizes="(max-width: 640px) 100vw, 440px"
                className="object-cover object-center select-none transition-all duration-300"
              />
            </div>

            {/* Content Panel — Clean & Simple */}
            <div className="relative px-6 py-6 sm:px-8 sm:py-7 flex flex-col justify-center text-center bg-white">
              {isSuccess ? (
                /* Success Confirmation State */
                <div data-testid="newsletter-popup-success" className="py-2 text-center">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
                    <Check className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
                  </div>
                  <h2
                    id="newsletter-popup-title"
                    className="text-xl font-semibold text-neutral-900 leading-tight"
                  >
                    You&apos;re on the list.
                  </h2>
                  <p
                    id="newsletter-popup-description"
                    className="mt-2 text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-[320px] mx-auto"
                  >
                    Thank you for joining the PERALAGAE Circle. Look forward to curated inspirations and private previews in your inbox.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-neutral-900 px-6 text-xs font-semibold tracking-wider uppercase text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Clean Title */}
                  <h2
                    id="newsletter-popup-title"
                    className="text-2xl font-semibold text-neutral-900 tracking-tight text-center"
                  >
                    Join the our family
                  </h2>

                  {/* Clean Description */}
                  <p
                    id="newsletter-popup-description"
                    className="mt-1.5 text-xs sm:text-[13px] text-neutral-500 leading-relaxed max-w-[320px] mx-auto text-center"
                  >
                    Sign up to get all the latest fashion news, website updates, offers and promos.
                  </p>

                  <form
                    onSubmit={handleSubmit}
                    data-testid="newsletter-popup-form"
                    className="mt-5 space-y-3"
                    noValidate
                  >
                    <div>
                      {/* Email Field */}
                      <input
                        ref={inputRef}
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Enter your email address"
                        aria-label="Email address"
                        data-testid="newsletter-popup-email-input"
                        disabled={isSubmitting}
                        className="h-11 w-full rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-60 text-center"
                        autoComplete="email"
                        spellCheck="false"
                      />
                      {error && (
                        <p
                          role="alert"
                          data-testid="newsletter-popup-error"
                          className="mt-1.5 text-xs text-rose-600 text-center font-medium"
                        >
                          {error}
                        </p>
                      )}
                    </div>

                    {/* Subscribe Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      data-testid="newsletter-popup-submit-btn"
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-neutral-900 text-xs font-semibold tracking-wider uppercase text-white transition-all hover:bg-black active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-75 shadow-xs cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          <span>Subscribing…</span>
                        </span>
                      ) : (
                        <span>SUBSCRIBE</span>
                      )}
                    </button>

                    {/* Dismissal Checkbox */}
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <input
                        id="newsletter-do-not-show"
                        type="checkbox"
                        checked={doNotShowAgain}
                        onChange={(e) => handleToggleDoNotShowAgain(e.target.checked)}
                        data-testid="newsletter-popup-do-not-show-checkbox"
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 accent-neutral-900 cursor-pointer"
                      />
                      <label
                        htmlFor="newsletter-do-not-show"
                        className="text-[11px] text-neutral-500 cursor-pointer select-none"
                      >
                        Do not show this window
                      </label>
                    </div>
                  </form>
                </>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
