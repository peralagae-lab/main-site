"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  PanelTop,
  Layers,
  Package,
  Gem,
  Instagram,
  PanelBottom,
  ShoppingBag,
  Percent,
  Mail,
  Users,
} from "lucide-react";
import { brandConfig } from "@/config/brand";

export interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Slide-out Admin Navigation Sidebar
 *
 * Requirements:
 * - Opens smoothly from left to right with semi-transparent backdrop
 * - Closes on close button, backdrop click, or Escape key
 * - Prevents background scrolling while open
 * - Displays small drawer heading: PERALAGAE
 * - Contains Dashboard, Header Management, Categories, Products, Materials, and Instagram items
 * - Minimal white-and-neutral visual style with restrained gold accent
 */
export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock background body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const isDashboardActive = pathname === "/admin/dashboard" || pathname === "/admin";
  const isNavbarActive = pathname === "/admin/navbar" || pathname.startsWith("/admin/navbar");
  const isCategoriesActive =
    pathname === "/admin/categories" || pathname.startsWith("/admin/categories");
  const isProductsActive =
    pathname === "/admin/products" || pathname.startsWith("/admin/products");
  const isMaterialsActive =
    pathname === "/admin/materials" || pathname.startsWith("/admin/materials");
  const isInstagramActive =
    pathname === "/admin/instagram" || pathname.startsWith("/admin/instagram");
  const isOrdersActive =
    pathname === "/admin/orders" || pathname.startsWith("/admin/orders");
  const isEmailsActive =
    pathname === "/admin/emails" || pathname.startsWith("/admin/emails");
  const isSubscribersActive =
    pathname === "/admin/subscribers" || pathname.startsWith("/admin/subscribers");
  const isGstActive =
    pathname === "/admin/gst" || pathname.startsWith("/admin/gst");
  const isFooterActive =
    pathname === "/admin/footer" ||
    pathname.startsWith("/admin/footer") ||
    pathname === "/admin/contact" ||
    pathname.startsWith("/admin/contact");

  return (
    <>
      {/* Subtle Semi-Transparent Backdrop */}
      <div
        data-testid="admin-sidebar-backdrop"
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-out Drawer */}
      <aside
        ref={drawerRef}
        data-testid="admin-sidebar-drawer"
        aria-label="Admin Navigation"
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white border-r border-[#E5E7EB] flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-medium tracking-[0.18em] uppercase text-[#1A1A1A]">
              {brandConfig.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            data-testid="admin-sidebar-close-button"
            className="p-2 sm:p-1.5 -mr-1 text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5 stroke-[1.5]" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Content Area */}
        <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto overscroll-contain">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isDashboardActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <LayoutDashboard
              className={`w-4 h-4 shrink-0 transition-colors ${
                isDashboardActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/navbar"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isNavbarActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <PanelTop
              className={`w-4 h-4 shrink-0 transition-colors ${
                isNavbarActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Header Management</span>
          </Link>

          <Link
            href="/admin/categories"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isCategoriesActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Layers
              className={`w-4 h-4 shrink-0 transition-colors ${
                isCategoriesActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Categories</span>
          </Link>

          <Link
            href="/admin/products"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isProductsActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Package
              className={`w-4 h-4 shrink-0 transition-colors ${
                isProductsActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Products</span>
          </Link>

          <Link
            href="/admin/orders"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isOrdersActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <ShoppingBag
              className={`w-4 h-4 shrink-0 transition-colors ${
                isOrdersActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Orders</span>
          </Link>

          <Link
            href="/admin/emails"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isEmailsActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Mail
              className={`w-4 h-4 shrink-0 transition-colors ${
                isEmailsActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Email Logs</span>
          </Link>

          <Link
            href="/admin/subscribers"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isSubscribersActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Users
              className={`w-4 h-4 shrink-0 transition-colors ${
                isSubscribersActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Subscribers</span>
          </Link>

          <Link
            href="/admin/materials"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isMaterialsActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Gem
              className={`w-4 h-4 shrink-0 transition-colors ${
                isMaterialsActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Materials</span>
          </Link>

          <Link
            href="/admin/instagram"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isInstagramActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Instagram
              className={`w-4 h-4 shrink-0 transition-colors ${
                isInstagramActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Instagram</span>
          </Link>

          <Link
            href="/admin/gst"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isGstActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <Percent
              className={`w-4 h-4 shrink-0 transition-colors ${
                isGstActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>GST Settings</span>
          </Link>

          <Link
            href="/admin/footer"
            onClick={onClose}
            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-colors duration-150 ${
              isFooterActive
                ? "bg-[#F5F5F5] text-[#111111] font-semibold border-l-2 border-[#C5A572]"
                : "text-[#666666] hover:bg-[#F9F9F9] hover:text-[#111111]"
            }`}
          >
            <PanelBottom
              className={`w-4 h-4 shrink-0 transition-colors ${
                isFooterActive ? "text-[#C5A572]" : "text-[#888888]"
              }`}
              aria-hidden="true"
            />
            <span>Footer</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
