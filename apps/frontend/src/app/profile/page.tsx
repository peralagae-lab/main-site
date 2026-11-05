"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  X,
  Save,
  Package,
  ArrowLeft,
  Lock,
  Plus,
  ExternalLink,
  Clock,
  RefreshCw,
  Truck,
  ShoppingBag,
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
import { OrderClientService } from "@/services/order-client-service";
import { type Order, type OrderStatus } from "@/types/order";
import { formatInr } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const {
    customer,
    isAuthenticated,
    isCustomerAuthLoading,
    updateProfile,
    refreshCustomer,
    openAuthModal,
    notify,
  } = useStorefront();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable Form Fields
  const [fullName, setFullName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const country = "India";

  // Validation errors
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Orders state
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Sync form state with customer data
  const syncFromCustomer = useCallback(
    (cust = customer) => {
      if (cust) {
        setFullName(cust.fullName || "");
        setRecipientName(cust.profile?.recipientName || cust.fullName || "");
        setPhone(cust.profile?.phone || "");
        setStreetAddress(cust.profile?.streetAddress || "");
        setCity(cust.profile?.city || "");
        setState(cust.profile?.state || "");
        setPinCode(cust.profile?.pinCode || "");
      }
    },
    [customer]
  );

  useEffect(() => {
    syncFromCustomer();
  }, [customer, syncFromCustomer]);

  // Fetch full profile directly from MongoDB API on mount to guarantee fresh address data
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && customer) {
      CustomerAuthService.getProfile()
        .then((details) => {
          if (!isMounted || !details) return;
          if (details.fullName) setFullName(details.fullName);
          if (details.profile) {
            setRecipientName(details.profile.recipientName || details.fullName || customer.fullName || "");
            setPhone(details.profile.phone || "");
            setStreetAddress(details.profile.streetAddress || "");
            setCity(details.profile.city || "");
            setState(details.profile.state || "");
            setPinCode(details.profile.pinCode || "");
          }
          // If customer in provider didn't have profile attached, trigger refresh
          if (!customer.profile && details.profile) {
            refreshCustomer();
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, customer?.id, refreshCustomer]);

  // Fetch customer orders for overview
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      setIsLoadingOrders(true);
      OrderClientService.getMyOrders()
        .then((orders) => {
          if (isMounted) setRecentOrders(orders);
        })
        .catch(() => {
          if (isMounted) setRecentOrders([]);
        })
        .finally(() => {
          if (isMounted) setIsLoadingOrders(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Loading state
  if (isCustomerAuthLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mb-3" />
        <p className="text-sm text-neutral-500">Loading profile...</p>
      </div>
    );
  }

  // Guest prompt
  if (!isAuthenticated || !customer) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto bg-white">
        <div className="h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center mb-4 border border-neutral-200">
          <Lock className="h-5 w-5 stroke-[1.5]" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
          Sign In to Access Your Profile
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-6">
          Please sign in to view and manage your PERALAGAE account details and default shipping address.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login", "/profile")}
          className="px-6 py-3 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Profile Incomplete Banner
  const isProfileIncomplete = !customer.isProfileComplete || !customer.profile?.isComplete;

  const validatePhone = (value: string): boolean => {
    if (!value.trim()) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!isValidIndianPhone(value)) {
      setPhoneError("Please enter a valid 10-digit Indian phone number");
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
      setPinError("Please enter a valid 6-digit Indian PIN code");
      return false;
    }
    setPinError(null);
    return true;
  };

  const handleStartEdit = () => {
    syncFromCustomer();
    setIsEditing(true);
  };

  const handleCancel = () => {
    syncFromCustomer();
    setPhoneError(null);
    setPinError(null);
    setFormError(null);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      const msg = "Full name must be at least 2 characters.";
      setFormError(msg);
      notify.warning("Invalid name", { description: msg });
      return;
    }
    if (!recipientName.trim() || recipientName.trim().length < 2) {
      const msg = "Recipient full name must be at least 2 characters.";
      setFormError(msg);
      notify.warning("Invalid recipient name", { description: msg });
      return;
    }
    if (!validatePhone(phone)) {
      notify.warning("Invalid phone number", { description: "Please enter a valid 10-digit Indian mobile number." });
      return;
    }
    if (!streetAddress.trim() || streetAddress.trim().length < 5) {
      const msg = "Street address must be at least 5 characters.";
      setFormError(msg);
      notify.warning("Missing street address", { description: msg });
      return;
    }
    if (!city.trim() || city.trim().length < 2) {
      const msg = "Please enter a valid city name.";
      setFormError(msg);
      notify.warning("Missing city", { description: msg });
      return;
    }
    if (!state.trim()) {
      const msg = "Please select your state.";
      setFormError(msg);
      notify.warning("Missing state", { description: msg });
      return;
    }
    if (!validatePin(pinCode)) {
      notify.warning("Invalid PIN code", { description: "Please enter a valid 6-digit Indian PIN code." });
      return;
    }

    setIsSaving(true);

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

      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const error = err as Error;
      const msg = error?.message || "Failed to update profile. Please check your information.";
      setFormError(msg);
      notify.error("Could not update profile", { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStatusBadge = (orderStatus: OrderStatus | string) => {
    switch (orderStatus) {
      case "PLACED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Order Placed</span>
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 text-amber-600" />
            <span>Preparing in Boutique</span>
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-600" />
            <span>Dispatched</span>
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Delivered & Received</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
            {orderStatus}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 text-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 uppercase tracking-wider transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Storefront</span>
          </Link>

          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
          >
            <Package className="h-3.5 w-3.5" />
            <span>My Orders ({recentOrders.length})</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-neutral-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
              My Profile
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Manage your personal account details, saved default shipping address, and order tracking.
            </p>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              data-testid="edit-profile-button"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer self-start sm:self-auto active:scale-[0.98]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {/* Incomplete Profile Alert */}
        {isProfileIncomplete && (
          <div
            role="alert"
            className="mb-8 p-5 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">
                  Profile Setup Incomplete
                </h3>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Your default shipping address has not been saved yet. Please complete your profile to enable express checkout.
                </p>
              </div>
            </div>
            <Link
              href="/profile/setup"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto text-center"
            >
              Complete Setup
            </Link>
          </div>
        )}

        {/* Complete Profile Confirmation Badge */}
        {!isProfileIncomplete && !isEditing && (
          <div className="mb-8 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="font-semibold text-emerald-950">Profile Verified & Insured Delivery Active.</strong> Your default shipping address is securely synchronized in MongoDB for express checkout.
              </span>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {successMessage && (
          <div
            role="status"
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 rounded-xl flex items-center gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Profile Content */}
        {!isEditing ? (
          /* ================= VIEW MODE ================= */
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Account Information Card */}
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-colors">
                <div>
                  <div className="flex items-center gap-2.5 border-b border-neutral-200 pb-4 mb-6">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-neutral-700" />
                    </div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                      Account Information
                    </h2>
                  </div>

                  <div className="space-y-6 text-sm">
                    <div>
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        Full Name
                      </span>
                      <p className="font-semibold text-neutral-900 text-base" data-testid="profile-view-fullname">
                        {customer.fullName || "—"}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                          Registered Email
                        </span>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      </div>
                      <p className="font-medium text-neutral-900 break-all" data-testid="profile-view-email">
                        {customer.email}
                      </p>
                    </div>

                    {customer.profile?.phone && (
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Contact Phone
                        </span>
                        <p className="font-medium text-neutral-900">
                          +91 {customer.profile.phone}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                        Account Role
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-neutral-800 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-md inline-block">
                        PERALAGAE Customer
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-8 border-t border-neutral-200 flex items-center text-xs text-neutral-500">
                  <span>Registered account since {new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                </div>
              </div>

              {/* Default Shipping Address Card */}
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-neutral-700" />
                      </div>
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                        Default Shipping Address
                      </h2>
                    </div>

                    {!customer.profile ? (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {customer.profile ? (
                    <div className="space-y-5 text-sm">
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Recipient Full Name
                        </span>
                        <p className="font-semibold text-neutral-900 text-base" data-testid="profile-view-recipient">
                          {customer.profile.recipientName}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Contact Phone
                        </span>
                        <p className="font-medium text-neutral-900" data-testid="profile-view-phone">
                          +91 {customer.profile.phone}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                          Delivery Address
                        </span>
                        <p className="text-neutral-700 leading-relaxed" data-testid="profile-view-address">
                          {customer.profile.streetAddress}
                          <br />
                          {customer.profile.city}, {customer.profile.state} — {customer.profile.pinCode}
                          <br />
                          {customer.profile.country || "India"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 mb-3">
                        <MapPin className="h-5 w-5 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-medium text-neutral-900 mb-1">
                        No default address saved yet
                      </p>
                      <p className="text-xs text-neutral-500 max-w-xs mb-5 leading-relaxed">
                        Save a default delivery address for faster, 1-click insured checkout.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="px-4 py-2 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        Add Address
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-8 border-t border-neutral-200">
                  <span className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Default address for 1-click insured checkout</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-neutral-700" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                      Recent Orders & Tracking
                    </h2>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Live status, dispatch updates, and insured courier delivery history
                    </p>
                  </div>
                </div>

                <Link
                  href="/orders"
                  className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>View All Orders</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {isLoadingOrders ? (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-700 mb-2" />
                  <p className="text-xs text-neutral-500">Loading order history...</p>
                </div>
              ) : recentOrders.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {recentOrders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-neutral-900">
                            {order.orderNumber}
                          </span>
                          {renderStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-neutral-500">
                          Placed on{" "}
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {order.items?.length || 1} {order.items?.length === 1 ? "item" : "items"}
                        </p>
                        <p className="text-xs font-medium text-neutral-900">
                          Total: {formatInr(order.totalInr)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="px-3.5 py-2 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <Truck className="h-3 w-3" />
                          <span>Track Order</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 mb-2">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium text-neutral-900 mb-0.5">No orders placed yet</p>
                  <p className="text-[11px] text-neutral-500 mb-4">
                    Explore our curated collections of hallmarked gold jewellery.
                  </p>
                  <Link
                    href="/shop"
                    className="px-4 py-2 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
                  >
                    Explore Catalogue
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= EDIT MODE ================= */
          <div className="bg-white p-6 sm:p-10 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-5 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Edit Profile & Address</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Update your contact and shipping information. Changes will be saved permanently in MongoDB.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                data-testid="cancel-profile-edit-button"
                className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8" noValidate>
              {/* Account Information Section */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
                  1. Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Email (Strictly Read-Only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-neutral-700">
                        Registered Email Address
                      </label>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                    <input
                      type="email"
                      disabled
                      readOnly
                      value={customer.email}
                      aria-readonly="true"
                      className="w-full h-11 px-3.5 text-sm bg-neutral-50 border border-neutral-200 text-neutral-500 rounded-lg outline-none cursor-not-allowed select-none"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Account email is protected and cannot be changed here.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Full Name"
                      data-testid="profile-edit-fullname-input"
                      className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Default Shipping Address Section */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 mb-4 pb-2 border-b border-neutral-100">
                  2. Default Shipping Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Recipient Full Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Recipient Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Name of recipient receiving deliveries"
                      data-testid="profile-edit-recipient-input"
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
                        data-testid="profile-edit-phone-input"
                        className={`w-full h-11 pl-12 pr-3.5 text-sm bg-white border rounded-lg outline-none transition-colors ${
                          phoneError ? "border-red-500 focus:border-red-500" : "border-neutral-300 focus:border-neutral-900"
                        }`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-[11px] text-red-500 mt-1">{phoneError}</p>
                    ) : (
                      <p className="text-[11px] text-neutral-400 mt-1">10 digits starting with 6, 7, 8, or 9.</p>
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
                      className="w-full h-11 px-3.5 text-sm bg-neutral-50 border border-neutral-200 text-neutral-500 rounded-lg outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Street Address */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Street Address / House Number / Landmark <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Flat, House no., Building, Apartment, Street & Landmark"
                      data-testid="profile-edit-street-input"
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
                      data-testid="profile-edit-city-input"
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
                      data-testid="profile-edit-state-select"
                      className="w-full h-11 px-3.5 text-sm bg-white border border-neutral-300 focus:border-neutral-900 rounded-lg outline-none transition-colors cursor-pointer"
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
                      data-testid="profile-edit-pincode-input"
                      className={`w-full h-11 px-3.5 text-sm bg-white border rounded-lg outline-none transition-colors ${
                        pinError ? "border-red-500 focus:border-red-500" : "border-neutral-300 focus:border-neutral-900"
                      }`}
                    />
                    {pinError && <p className="text-[11px] text-red-500 mt-1">{pinError}</p>}
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  data-testid="save-profile-changes-button"
                  className="w-full sm:w-auto px-7 py-3 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCancel}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
