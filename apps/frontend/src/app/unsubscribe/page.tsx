"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Mail, BellOff, ArrowRight } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [cartRemindersEnabled, setCartRemindersEnabled] = useState<boolean>(true);
  const [orderUpdatesEnabled, setOrderUpdatesEnabled] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage("No preference verification token provided. Please check your email link.");
      return;
    }

    const fetchPreferences = async () => {
      try {
        const res = await fetch(`/api/emails/preferences?token=${encodeURIComponent(token)}`);
        const body = await res.json();
        if (res.ok && body.success && body.data) {
          setCustomerEmail(body.data.email);
          setCartRemindersEnabled(body.data.emailCartRemindersEnabled);
          setOrderUpdatesEnabled(body.data.emailOrderUpdatesEnabled);
        } else {
          setErrorMessage(body?.error?.message || "Invalid or expired preference link.");
        }
      } catch {
        setErrorMessage("Unable to connect to service. Please try again shortly.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [token]);

  const handleUpdatePreferences = async (cartReminders: boolean) => {
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/emails/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          emailCartRemindersEnabled: cartReminders,
          emailOrderUpdatesEnabled: orderUpdatesEnabled,
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        setCartRemindersEnabled(cartReminders);
        setSuccessMessage(
          cartReminders
            ? "You are now subscribed to PERALAGAE cart reminders."
            : "You have been successfully unsubscribed from PERALAGAE cart reminders."
        );
      } else {
        setErrorMessage(body?.error?.message || "Failed to update email preferences.");
      }
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-[#EAE6DF] rounded-2xl p-6 sm:p-8 shadow-sm">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-block mb-3">
          <Image
            src="/images/logo/peralagae-logo.png"
            alt="PERALAGAE"
            width={160}
            height={66}
            className="h-10 w-auto object-contain mx-auto"
            priority
          />
        </Link>
        <h1 className="font-serif text-xl sm:text-2xl text-[#111111] font-normal">
          Email Preferences
        </h1>
        {customerEmail && (
          <p className="text-xs text-[#666666] mt-1 font-mono">{customerEmail}</p>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#C5A572]" />
          <span className="text-xs">Loading your email preferences...</span>
        </div>
      ) : errorMessage && !customerEmail ? (
        <div className="py-6 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-xs text-red-600 max-w-xs mx-auto">{errorMessage}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
          >
            <span>Return to PERALAGAE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="border-t border-b border-[#F0EFEA] py-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#111111] block">
                  Abandoned Cart Reminders
                </span>
                <p className="text-[11px] text-[#777777] leading-relaxed">
                  Gentle evening reminders when you leave fine jewellery pieces in your bag.
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                  cartRemindersEnabled
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                }`}
              >
                {cartRemindersEnabled ? "Active" : "Unsubscribed"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-3 border-t border-dashed border-[#F0EFEA]">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#111111] block">
                  Transactional Order Updates
                </span>
                <p className="text-[11px] text-[#777777] leading-relaxed">
                  Receipts, payment confirmations, and tracking updates with packaging images.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                Required
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {cartRemindersEnabled ? (
              <button
                type="button"
                onClick={() => handleUpdatePreferences(false)}
                disabled={isUpdating}
                className="w-full h-11 bg-white hover:bg-neutral-50 text-[#991B1B] border border-red-200 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                <span>Unsubscribe from Cart Reminders</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpdatePreferences(true)}
                disabled={isUpdating}
                className="w-full h-11 bg-[#111111] hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A572]" />
                ) : (
                  <Mail className="w-4 h-4 text-[#C5A572]" />
                )}
                <span>Re-enable Cart Reminders</span>
              </button>
            )}

            <Link
              href="/"
              className="w-full h-10 text-neutral-600 hover:text-neutral-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Return to PERALAGAE Store</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C5A572]" />
            Loading preferences...
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}

