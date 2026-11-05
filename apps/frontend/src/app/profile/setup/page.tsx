"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  LogOut,
  MapPin,
  User as UserIcon,
} from "lucide-react";
import { useStorefront } from "@/providers/storefront-provider";
import {
  INDIAN_STATES,
  cleanIndianPhone,
  isValidIndianPhone,
  cleanPinCode,
  isValidIndianPin,
} from "@/lib/profile-constants";
import { CustomerAuthService } from "@/services/customer-auth-service";

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const {
    customer,
    isAuthenticated,
    isCustomerAuthLoading,
    updateProfile,
    logoutCustomer,
    openAuthModal,
    notify,
  } = useStorefront();

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const country = "India";

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize fields from authenticated customer
  useEffect(() => {
    if (customer) {
      setFullName((prev) => prev || customer.fullName || "");
      setRecipientName((prev) => prev || customer.profile?.recipientName || customer.fullName || "");
      if (customer.profile) {
        setPhone((prev) => prev || customer.profile?.phone || "");
        setStreetAddress((prev) => prev || customer.profile?.streetAddress || "");
        setCity((prev) => prev || customer.profile?.city || "");
        setState((prev) => prev || customer.profile?.state || "");
        setPinCode((prev) => prev || customer.profile?.pinCode || "");
      }
    }
  }, [customer]);

  // If session is still loading
  if (isCustomerAuthLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mb-3" />
        <p className="text-sm text-neutral-500">Verifying customer account...</p>
      </div>
    );
  }

  // If not authenticated, prompt sign in
  if (!isAuthenticated || !customer) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto bg-white">
        <div className="h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center mb-4 border border-neutral-200">
          <Lock className="h-5 w-5 stroke-[1.5]" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
          Sign In Required
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-6">
          Please sign in or create an account to set up your customer profile and delivery address.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login", "/profile/setup")}
          className="px-6 py-3 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          Sign In to Peralagae
        </button>
      </div>
    );
  }

  // If profile is already complete and not currently saving
  if (customer.isProfileComplete && !saveSuccess) {
    return (
      <div className="min-h-[70vh] py-14 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto bg-white">
        <div className="bg-white border border-neutral-200 rounded-xl p-8 sm:p-10 shadow-xs text-center">
          <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <CheckCircle2 className="h-7 w-7 stroke-[1.5]" />
          </div>
          <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase mb-1">
            Profile Verified
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Your Profile is Already Complete
          </h1>
          <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
            Welcome, <span className="font-semibold text-neutral-900">{customer.fullName}</span>. Your
            account and default shipping details are securely saved in MongoDB.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("/profile/setup") ? returnUrl : "/"}
              className="px-6 py-3 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>{returnUrl ? "Continue to Destination" : "Explore Collections"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/profile"
              className="px-6 py-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center justify-center"
            >
              View & Edit Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const validatePhone = (value: string): boolean => {
    if (!value.trim()) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!isValidIndianPhone(value)) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const validatePin = (value: string): boolean => {
    if (!value.trim()) {
      setPinError("PIN code is required");
      return false;
    }
    if (!isValidIndianPin(value)) {
      setPinError("Please enter a valid 6-digit Indian PIN code (e.g. 400001)");
      return false;
    }
    setPinError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Full Name check
    if (!fullName.trim() || fullName.trim().length < 2) {
      const msg = "Please enter your full name.";
      setFormError(msg);
      notify.warning("Invalid name", { description: msg });
      return;
    }

    // Recipient Name check
    if (!recipientName.trim() || recipientName.trim().length < 2) {
      const msg = "Please enter the recipient full name.";
      setFormError(msg);
      notify.warning("Invalid recipient name", { description: msg });
      return;
    }

    // Phone validation
    if (!validatePhone(phone)) {
      notify.warning("Invalid phone number", { description: "Please enter a valid 10-digit Indian mobile number." });
      return;
    }

    // Address check
    if (!streetAddress.trim() || streetAddress.trim().length < 5) {
      const msg = "Please enter your complete street address (minimum 5 characters).";
      setFormError(msg);
      notify.warning("Missing street address", { description: msg });
      return;
    }

    // City check
    if (!city.trim() || city.trim().length < 2) {
      const msg = "Please enter your city.";
      setFormError(msg);
      notify.warning("Missing city", { description: msg });
      return;
    }

    // State check
    if (!state.trim()) {
      const msg = "Please select your state.";
      setFormError(msg);
      notify.warning("Missing state", { description: msg });
      return;
    }

    // PIN validation
    if (!validatePin(pinCode)) {
      notify.warning("Invalid PIN code", { description: "Please enter a valid 6-digit Indian PIN code." });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProfile({
        fullName: fullName.trim(),
        recipientName: recipientName.trim(),
        phone: cleanIndianPhone(phone),
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: cleanPinCode(pinCode),
        country,
      });

      setSaveSuccess(true);

      // Safe redirect after completion
      setTimeout(() => {
        const dest =
          returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("/profile/setup")
            ? returnUrl
            : "/";
        window.location.href = dest;
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error?.message || "Failed to save profile. Please check your details.";
      setFormError(msg);
      notify.error("Could not save profile", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-10 sm:py-14 text-neutral-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-xs font-medium text-neutral-700 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure Profile Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
            Please complete your account information and default shipping address before exploring
            PERALAGAE fine jewellery.
          </p>
        </div>

        {/* Success Banner */}
        {saveSuccess && (
          <div
            role="status"
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 rounded-xl flex items-center gap-3 animate-in fade-in"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Profile saved successfully!</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Redirecting you to your destination...
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {formError && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Profile Setup Card */}
        <div className="bg-white p-6 sm:p-9 rounded-xl border border-neutral-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            {/* Section 1: Account Information */}
            <div>
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-5">
                <UserIcon className="h-4 w-4 text-neutral-700" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                  1. Account Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address - Strictly Read-Only */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-neutral-700">
                      Registered Email Address
                    </label>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Verified & Read-only
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={customer.email}
                    aria-readonly="true"
                    data-testid="profile-email-input"
                    className="w-full h-11 px-3.5 text-sm bg-neutral-50 border border-neutral-200 text-neutral-500 rounded-lg outline-none cursor-not-allowed select-none"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Your authenticated account email is protected and cannot be modified here.
                  </p>
                </div>

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    data-testid="profile-fullname-input"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Default Shipping Address */}
            <div>
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-5">
                <MapPin className="h-4 w-4 text-neutral-700" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                  2. Default Shipping Address
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Recipient Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Recipient Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Name of recipient receiving packages"
                    data-testid="profile-recipient-input"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Phone Number (India) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) validatePhone(e.target.value);
                      }}
                      onBlur={(e) => validatePhone(e.target.value)}
                      placeholder="98765 43210"
                      data-testid="profile-phone-input"
                      className={`w-full h-11 pl-12 pr-3.5 text-sm bg-white border rounded-lg outline-none transition-colors ${
                        phoneError ? "border-red-500 focus:border-red-500" : "border-neutral-300 focus:border-neutral-900"
                      }`}
                    />
                  </div>
                  {phoneError ? (
                    <p className="text-[11px] text-red-500 mt-1">{phoneError}</p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 mt-1">
                      10 digits starting with 6, 7, 8, or 9 for delivery SMS updates.
                    </p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={country}
                    data-testid="profile-country-input"
                    className="w-full h-11 px-3.5 text-sm bg-neutral-50 border border-neutral-200 text-neutral-500 rounded-lg outline-none cursor-not-allowed"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Insured express shipping is currently offered across India.
                  </p>
                </div>

                {/* Street Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Street Address / House Number / Landmark <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Flat, House no., Building, Apartment, Street & Landmark"
                    data-testid="profile-street-input"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    data-testid="profile-city-input"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    data-testid="profile-state-select"
                    className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors"
                  >
                    <option value="">Select State / Territory</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PIN Code */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => {
                      const clean = cleanPinCode(e.target.value);
                      setPinCode(clean);
                      if (pinError) validatePin(clean);
                    }}
                    onBlur={(e) => validatePin(e.target.value)}
                    placeholder="e.g. 400001"
                    data-testid="profile-pincode-input"
                    className={`w-full h-11 px-3.5 text-sm bg-white border rounded-lg outline-none transition-colors ${
                      pinError ? "border-red-500 focus:border-red-500" : "border-neutral-300 focus:border-neutral-900"
                    }`}
                  />
                  {pinError && <p className="text-[11px] text-red-500 mt-1">{pinError}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-5 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="submit"
                disabled={isSubmitting || saveSuccess}
                data-testid="save-profile-button"
                className="w-full sm:w-auto px-8 py-3 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await logoutCustomer();
                  router.push("/");
                }}
                className="text-xs text-neutral-500 hover:text-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mb-3" />
          <p className="text-sm text-neutral-500">Loading setup...</p>
        </div>
      }
    >
      <ProfileSetupContent />
    </Suspense>
  );
}
