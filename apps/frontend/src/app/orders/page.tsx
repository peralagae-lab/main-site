"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Truck,
  ArrowLeft,
  Loader2,
  ShoppingBag,
  ExternalLink,
  Clock,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { useStorefront } from "@/providers/storefront-provider";
import { OrderClientService } from "@/services/order-client-service";
import { type Order, type OrderStatus } from "@/types/order";
import { formatInr } from "@/lib/utils";

export default function CustomerOrdersPage() {
  const { customer, isAuthenticated, isCustomerAuthLoading, openAuthModal } = useStorefront();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isCustomerAuthLoading && !isAuthenticated) {
      openAuthModal("login", "/orders");
      setIsLoading(false);
      return;
    }

    if (isAuthenticated) {
      OrderClientService.getMyOrders()
        .then((data) => {
          setOrders(data);
        })
        .catch(() => {
          setOrders([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isAuthenticated, isCustomerAuthLoading, openAuthModal]);

  const renderStatusBadge = (status: OrderStatus | string) => {
    switch (status) {
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
      case "DELIVERY_ISSUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Delivery Issue</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            <RotateCcw className="w-3 h-3 text-neutral-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
            {status}
          </span>
        );
    }
  };

  if (isCustomerAuthLoading || isLoading) {
    return (
      <div className="min-h-[70vh] bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mb-2.5" />
        <p className="text-sm text-neutral-500">Loading your order history...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] bg-white flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="h-12 w-12 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center mb-4 border border-neutral-200">
          <Package className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">My Orders</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Please sign in to view your orders and track delivery status.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login", "/orders")}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-medium uppercase tracking-wider rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Section */}
        <div className="pb-6 border-b border-neutral-200">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 uppercase tracking-wider transition-colors mb-3 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Signed in as{" "}
            <span className="font-semibold text-neutral-900">{customer?.fullName}</span> (
            {customer?.email})
          </p>
        </div>

        {/* Orders List / Empty State */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-8 sm:p-14 text-center">
            <div className="h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto mb-4 border border-neutral-200">
              <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900 mb-1">No Orders Yet</h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6">
              You haven&apos;t placed any fine jewellery orders yet. Discover our handcrafted gold
              and diamond creations.
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-2.5 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-medium uppercase tracking-wider rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
            >
              Explore Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden transition-all hover:border-neutral-300"
              >
                {/* Order Top Meta Header */}
                <div className="bg-neutral-50/70 px-5 sm:px-6 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-neutral-500">Order Placed: </span>
                      <span className="font-medium text-neutral-900">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Order Number: </span>
                      <span className="font-mono font-semibold text-neutral-900">
                        {order.orderNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderStatusBadge(order.status)}
                    {order.paymentStatus === "PAID" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        PAID (Verified)
                      </span>
                    ) : order.paymentStatus === "FAILED" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        FAILED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        {order.paymentStatus || "PENDING"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="px-5 sm:px-6 py-4 divide-y divide-neutral-100">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-4"
                    >
                      <div className="relative h-14 w-14 rounded-lg bg-neutral-50 overflow-hidden border border-neutral-200 shrink-0">
                        {item.productImageUrl ? (
                          <Image
                            src={item.productImageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-neutral-400">
                            PERALAGAE
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Qty: {item.quantity} × {formatInr(item.unitPriceInr)}
                        </p>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-neutral-900">
                          {formatInr(item.totalPriceInr)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Footer with Total & Track CTA */}
                <div className="bg-white px-5 sm:px-6 py-3.5 border-t border-neutral-200 flex flex-wrap justify-between items-center gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500">Total: </span>
                    <span className="text-sm font-bold text-neutral-900">
                      {formatInr(
                        typeof order.totalInr === "number" && order.totalInr > 0
                          ? order.totalInr
                          : order.subtotalInr + (order.gstInclusive ? 0 : (order.taxInr || 0)) - (order.discountInr || 0) + (order.shippingInr || 0)
                      )}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-2">
                      ({order.gstInclusive ? "GST Included" : `+GST ${order.gstRate || 3}%`}: {formatInr(order.taxInr || 0)})
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-medium uppercase tracking-wider rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    <span>Track Order & Evidence</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
