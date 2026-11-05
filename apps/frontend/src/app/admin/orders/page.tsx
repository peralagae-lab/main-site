"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
} from "lucide-react";
import { OrderAdminService } from "@/services/order-admin-service";
import { logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { type Order, type OrderStatus, type PaymentStatus } from "@/types/order";
import { formatInr } from "@/lib/utils";

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "ALL" },
  { label: "Placed", value: "PLACED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Delivery Issue", value: "DELIVERY_ISSUE" },
  { label: "Cancelled", value: "CANCELLED" },
];

const PAYMENT_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Payment Statuses", value: "ALL" },
  { label: "Simulated (Test)", value: "SIMULATED" },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout & Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await OrderAdminService.getOrders({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: status !== "ALL" ? status : undefined,
        paymentStatus: paymentStatus !== "ALL" ? paymentStatus : undefined,
      });

      setOrders(res.orders || []);
      setTotalPages(res.pagination.pages || 1);
      setTotalOrders(res.pagination.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load orders";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, paymentStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const renderStatusBadge = (statusVal: OrderStatus | string) => {
    switch (statusVal) {
      case "PLACED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Placed</span>
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 text-amber-600" />
            <span>Processing</span>
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-600" />
            <span>Shipped</span>
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case "DELIVERY_ISSUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Delivery Issue</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            <RotateCcw className="w-3 h-3 text-neutral-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
            {statusVal}
          </span>
        );
    }
  };

  const renderPaymentBadge = (paymentStatusVal: PaymentStatus | string) => {
    switch (paymentStatusVal) {
      case "PAID":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            PAID (Verified)
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            PENDING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            FAILED
          </span>
        );
      case "SIMULATED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
            SIMULATED
          </span>
        );
      default:
        return <span className="text-xs text-neutral-600">{paymentStatusVal}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Slide-out Sidebar Drawer */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 bg-white space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Link href="/admin/dashboard" className="hover:text-black transition-colors">
            Admin
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <Link href="/admin/orders" className="hover:text-black transition-colors">
            Sales
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-900 font-medium">Orders</span>
        </nav>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
                Order Management
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                {totalOrders} Total
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Real-time orders retrieved from MongoDB with verified stock & GST snapshots.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 text-xs font-medium bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-neutral-200 flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number (e.g. PLG-2026...)"
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:border-black focus:ring-1 focus:ring-black outline-none transition-colors"
            />
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-44 px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:border-black transition-colors"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Payment Status Filter */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-44 px-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg outline-none focus:border-black transition-colors"
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mx-auto mb-2.5" />
              <p className="text-sm text-neutral-600">Loading orders from database...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-900 mb-1">Failed to retrieve orders</p>
              <p className="text-xs text-neutral-500 mb-4">{error}</p>
              <div className="flex items-center justify-center gap-3">
                {error.toLowerCase().includes("auth") ? (
                  <Link
                    href="/admin/login"
                    className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-[#C5A572] active:bg-[#B3935F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    Log In to Admin
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => fetchOrders()}
                    className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-[#C5A572] active:bg-[#B3935F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center">
              <ShoppingBag className="w-10 h-10 text-neutral-400 mx-auto mb-3 stroke-[1.2]" />
              <h3 className="text-base font-semibold text-neutral-900 mb-1">No Orders Found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {search || status !== "ALL" || paymentStatus !== "ALL"
                  ? "No orders match your selected filters. Try clearing search or status filters."
                  : "No customer orders have been placed yet. As customers place orders via checkout, they will appear here in real-time."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order Number & Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Fulfilment Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {orders.map((order) => {
                    const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-neutral-50/70 transition-colors"
                      >
                        {/* Order Number & Date */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono font-semibold text-neutral-900 hover:text-black hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="text-[11px] text-neutral-500 mt-0.5">{dateStr}</p>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4">
                          <p className="font-medium text-neutral-900">
                            {order.customer?.fullName || order.shippingAddress?.fullName || "Valued Customer"}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-[200px]">
                            {order.customer?.email}
                          </p>
                        </td>

                        {/* Items */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-neutral-700">
                            <Package className="w-3.5 h-3.5 text-neutral-400" />
                            <span className="font-medium">
                              {order.items?.length || 0} {order.items?.length === 1 ? "Item" : "Items"}
                            </span>
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-semibold text-neutral-900">
                            {formatInr(
                              typeof order.totalInr === "number" && order.totalInr > 0
                                ? order.totalInr
                                : order.subtotalInr + (order.gstInclusive ? 0 : (order.taxInr || 0)) - (order.discountInr || 0) + (order.shippingInr || 0)
                            )}
                          </span>
                          <p className="text-[11px] text-neutral-500">
                            {order.gstInclusive ? "GST Included" : `+GST ${order.gstRate || 3}%`} ({formatInr(order.taxInr || 0)})
                          </p>
                        </td>

                        {/* Payment */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-neutral-900 flex items-center gap-1.5">
                              <span>{order.paymentProvider || "RAZORPAY"}</span>
                              <span className="text-neutral-400 font-normal">({order.paymentMethod})</span>
                            </div>
                            {renderPaymentBadge(order.paymentStatus)}
                          </div>
                        </td>

                        {/* Fulfilment Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {renderStatusBadge(order.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white hover:bg-[#C5A572] hover:text-white hover:border-[#C5A572] active:bg-[#B3935F] border border-neutral-200 rounded-lg transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-neutral-200 bg-white flex items-center justify-between text-xs">
              <span className="text-neutral-500">
                Page {page} of {totalPages} ({totalOrders} orders)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
