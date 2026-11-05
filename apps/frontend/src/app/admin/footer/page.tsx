"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  PanelBottom,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { getAdminSession, logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminStoreDetails,
  updateAdminStoreDetails,
  STORE_DETAILS_QUERY_KEY,
  STORE_DETAILS_UPDATED_EVENT,
} from "@/services/store-details-service";
import {
  NAVBAR_SETTINGS_QUERY_KEY,
  NAVBAR_SETTINGS_UPDATED_EVENT,
} from "@/services/navbar-settings-service";
import type { StoreDetailsData } from "@/types/store-details";

export default function AdminFooterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Authentication & Layout
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Status Notifications
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Loading & Saving States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Original Baseline State for Cancel Action
  const [originalDetails, setOriginalDetails] = useState<StoreDetailsData | null>(null);

  // EXACTLY THREE EDITABLE FIELDS
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");

  // Field Validation Errors
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string;
    address?: string;
    email?: string;
  }>({});

  // Verify Admin Session on Mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getAdminSession();
        if (!session?.email) {
          router.replace("/admin/login");
          return;
        }
        setIsVerifying(false);
      } catch {
        router.replace("/admin/login");
      }
    }
    checkAuth();
  }, [router]);

  // Load Existing Store Details
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminStoreDetails();
      setOriginalDetails(data);
      setPhone(data.phone || "");
      setAddress(data.address || "");
      setEmail(data.email || "");
      setFieldErrors({});
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load store details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isVerifying) {
      loadData();
    }
  }, [isVerifying]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAdmin();
      router.replace("/admin/login");
    } catch {
      router.replace("/admin/login");
    }
  };

  // Client-Side Validation
  const validateForm = (): boolean => {
    const errors: { phone?: string; address?: string; email?: string } = {};

    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const trimmedEmail = email.trim();

    // 1. Phone Validation
    if (!trimmedPhone) {
      errors.phone = "Phone number is required";
    } else if (trimmedPhone.length < 7 || trimmedPhone.length > 30) {
      errors.phone = "Phone number must be between 7 and 30 characters";
    } else if (!/^[+0-9\s\-().]+$/.test(trimmedPhone)) {
      errors.phone = "Phone number contains invalid characters (digits, +, -, () only)";
    }

    // 2. Address Validation
    if (!trimmedAddress) {
      errors.address = "Address is required";
    } else if (trimmedAddress.length < 3) {
      errors.address = "Address must be at least 3 characters";
    } else if (trimmedAddress.length > 500) {
      errors.address = "Address cannot exceed 500 characters";
    }

    // 3. Email Validation
    if (!trimmedEmail) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address";
    } else if (trimmedEmail.length > 100) {
      errors.email = "Email cannot exceed 100 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Cancel Action: Discard changes and restore original loaded database values
  const handleCancel = () => {
    if (originalDetails) {
      setPhone(originalDetails.phone || "");
      setAddress(originalDetails.address || "");
      setEmail(originalDetails.email || "");
    }
    setFieldErrors({});
    setStatusMessage({
      type: "info",
      text: "Changes discarded. Restored current database values.",
    });
  };

  // Save Changes Action: Persist updates to MongoDB database via backend API
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setStatusMessage({
        type: "error",
        text: "Please correct the highlighted errors before saving.",
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await updateAdminStoreDetails({
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
      });

      setOriginalDetails(updated);
      setPhone(updated.phone);
      setAddress(updated.address);
      setEmail(updated.email);

      setStatusMessage({
        type: "success",
        text: "Store details updated successfully! Contact number updated in the top navbar and storefront footer.",
      });

      // Invalidate queries & broadcast events for footer and top navbar
      queryClient.invalidateQueries({ queryKey: STORE_DETAILS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: NAVBAR_SETTINGS_QUERY_KEY });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(STORE_DETAILS_UPDATED_EVENT));
        window.dispatchEvent(new CustomEvent(NAVBAR_SETTINGS_UPDATED_EVENT));
        try {
          localStorage.setItem("peralagae:navbar_updated_at", String(Date.now()));
        } catch {
          // ignore localStorage error in private browsing
        }
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update store details.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#C5A572]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col font-sans">
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-black text-[#C5A572] rounded-md shadow-sm shrink-0">
                <PanelBottom className="w-5 h-5 stroke-[1.75]" />
              </span>
              <h1 className="text-lg sm:text-2xl font-light tracking-[0.05em] uppercase text-[#111111]">
                Footer & Store Details Management
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#666666]">
              Manage the telephone number, store boutique address, and email address displayed in the storefront footer.
            </p>
          </div>

          {originalDetails?.updatedAt && (
            <div className="text-left sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded border sm:border-0 border-[#E5E7EB] self-start sm:self-auto">
              <span className="text-[10px] sm:text-[11px] text-[#888888] uppercase tracking-wider block">
                Last Updated
              </span>
              <span className="text-xs text-[#444444] font-medium">
                {new Date(originalDetails.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`mt-4 p-3.5 sm:p-4 rounded-md flex items-start justify-between gap-3 text-xs sm:text-sm transition-all duration-300 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[#666666] hover:text-[#111111] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Container */}
        <div className="mt-5 sm:mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 sm:p-16 bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
              <Loader2 className="w-7 h-7 animate-spin text-[#C5A572]" />
              <p className="mt-3 text-xs text-[#888888] uppercase tracking-wider">
                Loading store details...
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSaveChanges}
              className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6"
            >
              <div className="flex items-center gap-2.5 pb-4 border-b border-[#F0F0F0]">
                <Sliders className="w-4 h-4 text-[#C5A572]" />
                <h2 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#111111]">
                  Store Contact Information
                </h2>
              </div>

              {/* 1. Phone Number */}
              <div>
                <label
                  htmlFor="phone-input"
                  className="block text-xs font-semibold tracking-wider uppercase text-[#333333] mb-1.5 sm:mb-2"
                >
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="phone-input"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder="e.g. 123 45678 90 or +91 98765 43210"
                  className={`w-full px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-base sm:text-sm text-[#111111] focus:bg-white focus:outline-none transition-colors ${
                    fieldErrors.phone
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-[#E0E0E0] focus:border-[#C5A572]"
                  }`}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? "phone-error" : "phone-help"}
                />
                {fieldErrors.phone ? (
                  <p id="phone-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.phone}
                  </p>
                ) : (
                  <p id="phone-help" className="mt-1.5 text-[11px] text-[#888888]">
                    Displayed under &ldquo;Need Any Help?&rdquo; with an automated <code className="text-[#333333]">tel:</code> link.
                  </p>
                )}
              </div>

              {/* 2. Address */}
              <div>
                <label
                  htmlFor="address-input"
                  className="block text-xs font-semibold tracking-wider uppercase text-[#333333] mb-1.5 sm:mb-2"
                >
                  Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="address-input"
                  name="address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  placeholder="e.g. 502 New Design Str, Melbourne, Australia"
                  className={`w-full px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-base sm:text-sm text-[#111111] focus:bg-white focus:outline-none transition-colors ${
                    fieldErrors.address
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-[#E0E0E0] focus:border-[#C5A572]"
                  }`}
                  aria-invalid={!!fieldErrors.address}
                  aria-describedby={fieldErrors.address ? "address-error" : "address-help"}
                />
                {fieldErrors.address ? (
                  <p id="address-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.address}
                  </p>
                ) : (
                  <p id="address-help" className="mt-1.5 text-[11px] text-[#888888]">
                    Physical store boutique address displayed in the footer.
                  </p>
                )}
              </div>

              {/* 3. Email Address */}
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-semibold tracking-wider uppercase text-[#333333] mb-1.5 sm:mb-2"
                >
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="e.g. contact@peralagae.com"
                  className={`w-full px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-base sm:text-sm text-[#111111] focus:bg-white focus:outline-none transition-colors ${
                    fieldErrors.email
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-[#E0E0E0] focus:border-[#C5A572]"
                  }`}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
                />
                {fieldErrors.email ? (
                  <p id="email-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                    {fieldErrors.email}
                  </p>
                ) : (
                  <p id="email-help" className="mt-1.5 text-[11px] text-[#888888]">
                    Customer care email address displayed with an automated <code className="text-[#333333]">mailto:</code> link.
                  </p>
                )}
              </div>

              {/* Actions Bar */}
              <div className="pt-6 border-t border-[#F0F0F0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 border border-[#D5D5D5] text-[#555555] hover:text-[#111111] hover:bg-gray-50 text-xs font-semibold tracking-wider uppercase rounded-md transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                <button
                  type="submit"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-black hover:bg-[#222222] text-[#C5A572] hover:text-[#D4AF37] text-xs font-semibold tracking-wider uppercase rounded-md shadow-md transition-all disabled:opacity-50 min-h-[44px] sm:min-h-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
