"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  ShieldCheck,
  FileText,
  MapPin,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { OrderClientService } from "@/services/order-client-service";
import { type Order, type OrderStatus } from "@/types/order";
import { formatInr } from "@/lib/utils";
import { useStorefront } from "@/providers/storefront-provider";

interface PageProps {
  params: Promise<{ id: string }>;
}

function CustomerOrderTrackingContent({ params }: { params?: Promise<{ id: string }> } = {}) {
  const routeParams = useParams();
  const [resolvedId, setResolvedId] = useState<string>(() => {
    const rId = routeParams?.id;
    return (Array.isArray(rId) ? rId[0] : rId) || "";
  });

  useEffect(() => {
    if (params) {
      params.then((p) => {
        if (p?.id) setResolvedId(p.id);
      }).catch(() => {});
    }
  }, [params]);

  const orderId = resolvedId;

  const { customer, isAuthenticated, isCustomerAuthLoading, openAuthModal, notify } =
    useStorefront();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delivery confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);

  // Lightbox for shipping photos
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await OrderClientService.getOrderById(orderId);
      if (!data) {
        setError("Order not found or you do not have permission to access it.");
      } else {
        setOrder(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!isCustomerAuthLoading && !isAuthenticated) {
      openAuthModal("login", `/orders/${orderId}`);
      setIsLoading(false);
      return;
    }

    if (isAuthenticated) {
      fetchOrder();
    }
  }, [isAuthenticated, isCustomerAuthLoading, orderId, openAuthModal, fetchOrder]);

  // Customer confirms delivery receipt
  const handleConfirmDelivery = async () => {
    if (isConfirmingDelivery) return;
    setIsConfirmingDelivery(true);

    try {
      const updated = await OrderClientService.confirmDelivery(orderId);
      setOrder(updated);
      setIsConfirmModalOpen(false);
      notify.success("Order receipt confirmed!", {
        description: "Thank you for confirming receipt of your PERALAGAE jewellery.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm receipt";
      notify.error("Delivery confirmation failed", { description: msg });
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  if (isCustomerAuthLoading || isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C5A572] mb-3" />
        <p className="text-sm text-[#666666]">Retrieving tracking details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mb-3 stroke-[1.5]" />
        <h1 className="text-xl sm:text-2xl font-serif text-[#111111] mb-2">Order Not Available</h1>
        <p className="text-xs text-[#666666] leading-relaxed mb-6">
          {error || "We could not find this order. Please verify you are signed in to the account that placed it."}
        </p>
        <Link
          href="/orders"
          className="px-6 py-3 bg-black hover:bg-[#222222] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  // Lifecycle steps calculation
  const steps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: "PLACED", label: "Order Placed", desc: "Order recorded in database" },
    { key: "PROCESSING", label: "Preparing", desc: "Inspected and packed in boutique" },
    { key: "SHIPPED", label: "Dispatched", desc: "In transit with secure courier" },
    { key: "DELIVERED", label: "Delivered", desc: "Receipt confirmed by you" },
  ];

  const currentStepIndex = (() => {
    switch (order.status) {
      case "PLACED":
        return 0;
      case "PROCESSING":
        return 1;
      case "SHIPPED":
        return 2;
      case "DELIVERED":
        return 3;
      default:
        return 0;
    }
  })();

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 text-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb / Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 uppercase tracking-wider transition-colors mb-2.5 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to My Orders</span>
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
                Track Order <span className="font-mono text-lg sm:text-xl font-semibold text-neutral-900">{order.orderNumber}</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Delivery confirmation CTA when SHIPPED */}
          {order.status === "SHIPPED" && (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Confirm Order Received</span>
            </button>
          )}

          {order.status === "DELIVERED" && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Delivery Confirmed</span>
            </div>
          )}
        </div>

        {/* Progress Bar Lifecycle Tracker */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-6">
            Fulfilment Progress
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
            {steps.map((st, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isUpcoming = idx > currentStepIndex;

              return (
                <div key={st.key} className="flex flex-col items-start relative text-left space-y-2">
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                        isPast
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-neutral-900 text-white ring-4 ring-neutral-100"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div
                      className={`h-1 flex-1 rounded ${
                        isPast
                          ? "bg-emerald-600"
                          : isCurrent
                          ? "bg-neutral-900"
                          : "bg-neutral-100"
                      }`}
                    />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-neutral-900"
                          : isPast
                          ? "text-emerald-700"
                          : "text-neutral-400"
                      }`}
                    >
                      {st.label}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping Evidence Gallery & Dispatch Details */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                  Shipping Evidence & Courier Information
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Photographic proof of sealed dispatch provided by the boutique
                </p>
              </div>
            </div>
          </div>

          {order.shippingUpdates && order.shippingUpdates.length > 0 ? (
            <div className="space-y-6">
              {order.shippingUpdates.map((update, idx) => (
                <div key={update.id || idx} className="p-5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-600 flex-wrap gap-2">
                    <span className="font-semibold text-neutral-900">
                      Carrier: {update.carrierName || "Direct Courier"}
                      {update.trackingNumber && ` — AWB / Tracking #${update.trackingNumber}`}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(update.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed bg-white p-3.5 rounded-lg border border-neutral-200">
                    {update.description}
                  </p>

                  {/* Responsive Shipping Photos Gallery */}
                  {update.images && update.images.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">
                        Parcel Dispatch Photos ({update.images.length}) — Click to view full size
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {update.images.map((img, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() => setActivePhoto(img.url)}
                            className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 hover:border-neutral-900 transition-all group cursor-pointer shadow-xs"
                          >
                            <Image
                              src={img.url}
                              alt={`Parcel dispatch ${imgIdx + 1}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-50/80 rounded-xl border border-neutral-200 p-6">
              <Clock className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
              <p className="font-semibold text-neutral-900 mb-1">Dispatch in Preparation</p>
              <p className="max-w-md mx-auto leading-relaxed">
                Our master artisans are carefully inspecting and preparing your hallmarked PERALAGAE
                jewellery package. As soon as the courier seals are attached, dispatch photos and tracking
                credentials will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Ordered Items & Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 pb-3 border-b border-neutral-200">
              Ordered Items ({order.items?.length || 0})
            </h2>

            <div className="divide-y divide-neutral-100">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-200 shrink-0">
                    {item.productImageUrl ? (
                      <Image
                        src={item.productImageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-400 font-serif">
                        PERALAGAE
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Qty: {item.quantity} × {formatInr(item.unitPriceInr)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-900">
                      {formatInr(item.totalPriceInr)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing and Delivery Address */}
          <div className="lg:col-span-5 space-y-6">
            {/* Financials */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-6 space-y-3.5 text-xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 pb-2 border-b border-neutral-200">
                Payment & Price Breakdown
              </h2>

              <div className="flex justify-between text-neutral-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-neutral-900">{formatInr(order.subtotalInr)}</span>
              </div>

              <div className="flex justify-between text-neutral-600">
                <span>Insured Express Shipping:</span>
                <span className="font-semibold text-emerald-700">Free</span>
              </div>

              <div className="flex justify-between text-neutral-700 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                <span>GST ({order.gstRate || 3}%{order.gstInclusive ? " Included" : ""}):</span>
                <span className="font-semibold text-neutral-900">
                  {order.gstInclusive ? "" : "+"}{formatInr(order.taxInr)}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Final Total:</span>
                <span>
                  {formatInr(
                    typeof order.totalInr === "number" && order.totalInr > 0
                      ? order.totalInr
                      : order.subtotalInr + (order.gstInclusive ? 0 : (order.taxInr || 0)) - (order.discountInr || 0) + (order.shippingInr || 0)
                  )}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Payment Gateway:</span>
                  <span className="font-semibold text-neutral-900">
                    {order.paymentProvider || "RAZORPAY"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Payment Method:</span>
                  <span className="font-semibold text-neutral-900">{order.paymentMethod}</span>
                </div>
                {order.razorpayPaymentId && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Transaction ID:</span>
                    <span className="font-mono text-[11px] text-neutral-800">
                      {order.razorpayPaymentId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Payment Status:</span>
                  {order.paymentStatus === "PAID" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      PAID (Verified)
                    </span>
                  ) : order.paymentStatus === "FAILED" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      FAILED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      {order.paymentStatus || "PENDING"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-6 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-900 pb-2 border-b border-neutral-200">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                <span>Destination Address</span>
              </div>
              <p className="font-semibold text-neutral-900">{order.shippingAddress?.fullName}</p>
              <p className="text-neutral-600 leading-relaxed">
                {order.shippingAddress?.addressLine || order.shippingAddress?.addressLine1}
              </p>
              <p className="text-neutral-600">
                {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p className="text-neutral-600">{order.shippingAddress?.country || "India"}</p>
              <p className="text-neutral-500 pt-1">Contact: {order.shippingAddress?.phone}</p>
            </div>
          </div>
        </div>

        {/* Detailed Timeline Audit Trail */}
        {order.statusLogs && order.statusLogs.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-6 sm:p-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 pb-3 mb-5 border-b border-neutral-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span>Tracking Timeline History</span>
            </h2>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
              {order.statusLogs.map((log, index) => {
                const dateStr = new Date(log.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={log.id || index} className="relative text-xs">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-neutral-900" />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900">
                        {log.toStatus === "PLACED" && "Order Placed Successfully"}
                        {log.toStatus === "PROCESSING" && "Package Being Prepared in Boutique"}
                        {log.toStatus === "SHIPPED" && "Package Dispatched via Express Courier"}
                        {log.toStatus === "DELIVERED" && "Delivery Completed and Confirmed"}
                        {log.toStatus === "CANCELLED" && "Order Cancelled"}
                        {log.toStatus === "DELIVERY_ISSUE" && "Transit Note Recorded"}
                      </span>
                      <span className="text-[11px] text-neutral-400">{dateStr}</span>
                    </div>
                    {log.note && <p className="text-xs text-neutral-600 mt-1">{log.note}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Customer Delivery Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-neutral-200 shadow-2xl p-6 sm:p-7 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-semibold text-neutral-900">Confirm Order Receipt</h3>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Have you safely received your insured PERALAGAE jewellery package for Order{" "}
              <strong className="text-neutral-900">{order.orderNumber}</strong>?
            </p>

            <div className="pt-2 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                Not Yet Received
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={isConfirmingDelivery}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
              >
                {isConfirmingDelivery ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Yes, Received</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom modal for customer viewing shipping photos */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-[80vh] flex items-center justify-center">
            <Image src={activePhoto} alt="Dispatch proof" fill className="object-contain" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-[#C5A572] text-white rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerOrderTrackingPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Loading Order Tracking...
            </p>
          </div>
        </div>
      }
    >
      <CustomerOrderTrackingContent params={props.params} />
    </React.Suspense>
  );
}
