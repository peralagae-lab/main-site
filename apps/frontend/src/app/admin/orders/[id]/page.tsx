"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  X,
  RefreshCw,
  MapPin,
  User,
  ShieldCheck,
  FileText,
  RotateCcw,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { OrderAdminService } from "@/services/order-admin-service";
import { logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { type Order, type OrderStatus } from "@/types/order";
import { formatInr } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

function AdminOrderDetailContent({ params }: { params?: Promise<{ id: string }> } = {}) {
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

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout & Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAdmin();
    } catch {
      // Safe fallback
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/?auth=login";
      }
    }
  };

  // Status update dialog / state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  // Payment Reconciliation state
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  const handleReconcilePayment = async () => {
    setIsReconciling(true);
    setReconcileResult(null);
    try {
      const res = await OrderAdminService.reconcilePayment(orderId);
      if (res.reconciled) {
        setOrder(res.order);
        setReconcileResult("Payment verified with Razorpay and updated to PAID.");
      } else {
        setReconcileResult(res.reason || "Status checked with Razorpay API (no change required).");
      }
    } catch (err: unknown) {
      setReconcileResult(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setIsReconciling(false);
    }
  };

  // Shipping Evidence Modal / Form state
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [carrierName, setCarrierName] = useState("Blue Dart Apex Insured");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingDescription, setShippingDescription] = useState(
    "Insured tamper-proof jewellery package handed to express courier."
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Image lightbox preview
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await OrderAdminService.getOrderById(orderId);
      setOrder(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load order";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Handle image selection for shipping evidence
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Status transition handler (e.g. PLACED -> PROCESSING)
  const handleTransitionStatus = async (toStatus: OrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await OrderAdminService.updateOrderStatus(orderId, toStatus, statusNote || undefined);
      setOrder(updated);
      setStatusNote("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit Shipping Evidence & mark SHIPPED
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingShipping) return;
    setShippingError(null);

    if (!shippingDescription.trim()) {
      setShippingError("Please provide a shipping description or dispatch note.");
      return;
    }

    setIsSubmittingShipping(true);
    try {
      const formData = new FormData();
      if (carrierName.trim()) formData.append("carrierName", carrierName.trim());
      if (trackingNumber.trim()) formData.append("trackingNumber", trackingNumber.trim());
      formData.append("description", shippingDescription.trim());

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const updated = await OrderAdminService.addShippingUpdate(orderId, formData);
      setOrder(updated);
      setIsShippingModalOpen(false);
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err: unknown) {
      setShippingError(err instanceof Error ? err.message : "Failed to save shipping evidence");
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-[#C5A572] animate-spin mb-3" />
        <p className="text-xs text-[#777777]">Loading order details from database...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto mb-3" />
        <h2 className="text-base font-serif text-[#111111] mb-2">Order Not Found</h2>
        <p className="text-xs text-[#777777] mb-6">{error || "Unable to locate order."}</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-[#222222]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Orders</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isSidebarOpen={isSidebarOpen}
      />
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 bg-white space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Link href="/admin/dashboard" className="hover:text-black transition-colors">
            Admin
          </Link>
          <span className="text-neutral-400">/</span>
          <Link href="/admin/orders" className="hover:text-black transition-colors">
            Sales
          </Link>
          <span className="text-neutral-400">/</span>
          <Link href="/admin/orders" className="hover:text-black transition-colors">
            Orders
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-900 font-medium">Order Details</span>
        </nav>

        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-lg border border-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
                  Order {order.orderNumber}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
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
          </div>

        {/* Action Controls for Status Transitions */}
        <div className="flex items-center gap-2 flex-wrap">
          {order.status === "PLACED" && (
            <button
              onClick={() => handleTransitionStatus("PROCESSING")}
              disabled={isUpdatingStatus}
              className="px-4 py-2 bg-black hover:bg-[#222222] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {isUpdatingStatus ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>Start Processing</span>
            </button>
          )}

          {(order.status === "PLACED" || order.status === "PROCESSING") && (
            <button
              onClick={() => setIsShippingModalOpen(true)}
              className="px-4 py-2 bg-[#7E22CE] hover:bg-[#6B21A8] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Ship Order (Add Evidence)</span>
            </button>
          )}

          {order.status === "SHIPPED" && (
            <div className="px-3.5 py-2 bg-[#FAF8F5] border border-[#EAE6DF] rounded-lg text-xs text-[#666666] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#C5A572]" />
              <span>Awaiting Customer Receipt Confirmation</span>
            </div>
          )}

          {order.status === "DELIVERED" && (
            <div className="px-3.5 py-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs text-[#065F46] flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Delivered & Confirmed by Customer</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items, Shipping Updates, Status Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Ordered Products Table */}
          <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#EAE6DF] bg-[#FAF8F5] flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                Ordered Products ({order.items?.length || 0})
              </h2>
              <span className="text-xs text-[#666666]">Immutable Snapshot</span>
            </div>

            <div className="divide-y divide-[#EAE6DF]">
              {order.items?.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex gap-4 items-center">
                  <div className="relative h-16 w-16 bg-[#FAF8F5] rounded-lg overflow-hidden border border-[#EAE6DF] shrink-0">
                    {item.productImageUrl ? (
                      <Image
                        src={item.productImageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                        PERALAGAE
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#111111]">{item.productName}</h3>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Unit Price: {formatInr(item.unitPriceInr)} | Qty: {item.quantity}
                    </p>
                    <p className="text-[11px] text-[#888888] mt-0.5">
                      GST snapshot: {item.gstRate || order.gstRate}% ({formatInr(item.taxInr || 0)})
                    </p>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <span className="text-sm font-semibold text-[#111111]">
                      {formatInr(item.totalPriceInr)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Evidence Gallery & Updates */}
          <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#7E22CE]" />
                <span>Shipping Evidence & Dispatch Updates</span>
              </h2>
              {order.status !== "SHIPPED" && order.status !== "DELIVERED" ? (
                <span className="text-xs text-[#777777]">Not Dispatched Yet</span>
              ) : (
                <button
                  onClick={() => setIsShippingModalOpen(true)}
                  className="text-xs text-[#7E22CE] hover:underline font-medium"
                >
                  + Add Dispatch Note
                </button>
              )}
            </div>

            {order.shippingUpdates && order.shippingUpdates.length > 0 ? (
              <div className="space-y-6">
                {order.shippingUpdates.map((update, idx) => (
                  <div
                    key={update.id || idx}
                    className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-[#666666] flex-wrap gap-2">
                      <span className="font-semibold text-[#111111]">
                        Carrier: {update.carrierName || "Direct Courier"}
                        {update.trackingNumber && ` (Tracking: ${update.trackingNumber})`}
                      </span>
                      <span>
                        {new Date(update.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-[#333333] leading-relaxed">{update.description}</p>

                    {/* Image Gallery */}
                    {update.images && update.images.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[11px] font-semibold text-[#777777] uppercase tracking-wider mb-2">
                          Dispatch Photos ({update.images.length})
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                          {update.images.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setZoomedImage(img.url)}
                              className="relative aspect-square rounded-lg overflow-hidden border border-[#DDDDDD] hover:border-[#C5A572] transition-colors group cursor-pointer"
                            >
                              <Image
                                src={img.url}
                                alt={`Shipping proof ${imgIdx + 1}`}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#777777]">
                No shipping evidence uploaded yet. When dispatching the jewellery parcel, upload parcel
                packaging photos and courier receipts here.
              </div>
            )}
          </div>

          {/* Chronological Status Timeline */}
          <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-sm p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111] mb-5 pb-3 border-b border-[#EAE6DF] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C5A572]" />
              <span>Order Status Audit Trail</span>
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EAE6DF]">
              {order.statusLogs?.map((log, index) => {
                const logDate = new Date(log.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={log.id || index} className="relative text-xs">
                    {/* Circle marker */}
                    <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[#C5A572] border-2 border-white ring-1 ring-[#C5A572]" />

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#111111]">
                        Status: {log.toStatus}
                      </span>
                      {log.fromStatus && (
                        <span className="text-[#888888]">(from {log.fromStatus})</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                        {log.updatedByRole}
                      </span>
                      <span className="text-[11px] text-[#888888] ml-auto">{logDate}</span>
                    </div>

                    {log.note && (
                      <p className="text-xs text-[#666666] mt-1 bg-[#FAF8F5] p-2 rounded border border-[#EAE6DF]">
                        {log.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Details, Address, Financials */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Details */}
          <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2 pb-3 border-b border-[#EAE6DF]">
              <User className="w-4 h-4 text-[#C5A572]" />
              <span>Customer Details</span>
            </h3>

            <div className="text-xs space-y-2">
              <p className="font-semibold text-sm text-[#111111]">
                {order.customer?.fullName || order.shippingAddress?.fullName}
              </p>
              <p className="text-[#666666]">{order.customer?.email}</p>
              <p className="text-[#666666]">Phone: {order.shippingAddress?.phone}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2 pb-3 border-b border-[#EAE6DF]">
              <MapPin className="w-4 h-4 text-[#C5A572]" />
              <span>Shipping Address</span>
            </h3>

            <div className="text-xs text-[#444444] space-y-1 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-lg border border-[#EAE6DF]">
              <p className="font-semibold text-[#111111]">{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.addressLine || order.shippingAddress?.addressLine1}</p>
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country || "India"}</p>
              <p className="pt-1 text-[#666666]">Tel: {order.shippingAddress?.phone}</p>
            </div>
          </div>

          {/* Financial Breakdown with GST Snapshot */}
          <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2 pb-3 border-b border-[#EAE6DF]">
              <FileText className="w-4 h-4 text-[#C5A572]" />
              <span>Order Summary & Tax Snapshot</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-[#666666]">
                <span>Items Subtotal:</span>
                <span className="font-medium text-[#111111]">{formatInr(order.subtotalInr)}</span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Insured Express Shipping:</span>
                <span className="font-semibold text-[#15803D]">Free</span>
              </div>

              <div className="flex justify-between text-[#666666] bg-[#FAF8F5] p-2 rounded border border-[#EAE6DF]">
                <span>GST ({order.gstRate}%) Snapshot{order.gstInclusive ? " (Included)" : ""}:</span>
                <span className="font-semibold text-[#111111]">
                  {order.gstInclusive ? "" : "+"}{formatInr(order.taxInr)}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-[#111111] pt-2 border-t border-[#EAE6DF]">
                <span>Total Amount:</span>
                <span>
                  {formatInr(
                    typeof order.totalInr === "number" && order.totalInr > 0
                      ? order.totalInr
                      : order.subtotalInr + (order.gstInclusive ? 0 : (order.taxInr || 0)) - (order.discountInr || 0) + (order.shippingInr || 0)
                  )}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAE6DF] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#666666]">Payment Gateway:</span>
                <span className="font-semibold text-[#111111]">
                  {order.paymentProvider || "RAZORPAY"}
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-[#666666]">Payment Method:</span>
                <span className="font-semibold text-[#111111]">{order.paymentMethod}</span>
              </div>

              {order.razorpayOrderId && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#666666]">Razorpay Order ID:</span>
                  <span className="font-mono text-[11px] text-[#111111]">
                    {order.razorpayOrderId}
                  </span>
                </div>
              )}

              {order.razorpayPaymentId && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#666666]">Razorpay Payment ID:</span>
                  <span className="font-mono text-[11px] text-[#111111]">
                    {order.razorpayPaymentId}
                  </span>
                </div>
              )}

              {order.paymentCapturedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#666666]">Captured At:</span>
                  <span className="text-[#111111]">
                    {new Date(order.paymentCapturedAt).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {order.paymentFailureReason && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
                  <span className="font-semibold">Failure Reason: </span>
                  <span>{order.paymentFailureReason}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-1 border-t border-[#EAE6DF]">
                <span className="text-[#666666]">Payment Status:</span>
                {order.paymentStatus === "PAID" ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PAID (Verified)
                  </span>
                ) : order.paymentStatus === "FAILED" ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    FAILED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    {order.paymentStatus || "PENDING"}
                  </span>
                )}
              </div>

              {order.paymentStatus !== "PAID" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReconcilePayment}
                    disabled={isReconciling}
                    className="w-full py-2 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] disabled:opacity-50 text-white text-[11px] font-medium uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isReconciling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Reconciling with Gateway...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconcile with Razorpay API</span>
                      </>
                    )}
                  </button>
                  {reconcileResult && (
                    <p className="mt-1.5 text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded border border-neutral-200">
                      {reconcileResult}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Evidence Modal */}
      {isShippingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EAE6DF] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#7E22CE]" />
                <h3 className="text-sm font-semibold text-[#111111] uppercase tracking-wider">
                  Dispatch & Shipping Evidence
                </h3>
              </div>
              <button
                onClick={() => setIsShippingModalOpen(false)}
                className="text-gray-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleShippingSubmit} className="p-5 space-y-4">
              {shippingError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{shippingError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#444444] mb-1">
                  Courier / Carrier Name
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="e.g. Blue Dart Apex / Sequel Logistics"
                  className="w-full px-3 py-2 text-xs border border-[#DDDDDD] rounded-lg focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#444444] mb-1">
                  Airway Bill / Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BD-9988776655"
                  className="w-full px-3 py-2 text-xs border border-[#DDDDDD] rounded-lg focus:border-black outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#444444] mb-1">
                  Dispatch Notes & Sealed Package Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={shippingDescription}
                  onChange={(e) => setShippingDescription(e.target.value)}
                  placeholder="Describe parcel security seals, insurance cover, and courier handover details."
                  className="w-full p-2.5 text-xs border border-[#DDDDDD] rounded-lg focus:border-black outline-none"
                />
              </div>

              {/* Upload Multiple Images */}
              <div>
                <label className="block text-xs font-medium text-[#444444] mb-1.5">
                  Attach Shipping & Parcel Photos (No Fixed Limit)
                </label>
                <div className="border-2 border-dashed border-[#DDDDDD] hover:border-[#C5A572] rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-5 h-5 text-[#888888] mx-auto mb-1" />
                  <p className="text-xs text-[#333333] font-medium">Click to select parcel photos</p>
                  <p className="text-[11px] text-[#888888]">JPEG, PNG, WebP supported</p>
                </div>

                {/* Previews */}
                {previewUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#DDDDDD]">
                        <Image src={url} alt="Proof" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-[#C5A572] text-white rounded-full transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsShippingModalOpen(false)}
                  className="px-4 py-2 border border-[#DDDDDD] rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShipping}
                  className="px-5 py-2 bg-[#7E22CE] hover:bg-[#6B21A8] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmittingShipping ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Dispatch...</span>
                    </>
                  ) : (
                    <span>Dispatch Order</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom modal for shipping images */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full h-[80vh] flex items-center justify-center">
            <Image
              src={zoomedImage}
              alt="Zoomed proof"
              fill
              className="object-contain"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-[#C5A572] text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default function AdminOrderDetailPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-medium">
              Loading Order Details...
            </p>
          </div>
        </div>
      }
    >
      <AdminOrderDetailContent params={props.params} />
    </React.Suspense>
  );
}
