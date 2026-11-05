"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Mail,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { logoutAdmin } from "@/services/admin-auth-service";
import {
  fetchAdminSubscribers,
  type NewsletterSubscriber,
} from "@/services/newsletter-admin-service";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // User feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Load subscribers from API
  const loadSubscribers = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const response = await fetchAdminSubscribers({
          page: currentPage,
          limit: 25,
          search: searchQuery,
          status: "ALL",
        });

        if (response.success && response.data) {
          setSubscribers(response.data.subscribers || []);
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.total || 0);
        }
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to load newsletter subscribers",
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, searchQuery]
  );

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  // Handle Copy Email
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => {
      setCopiedEmail((prev) => (prev === email ? null : prev));
    }, 2000);
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    if (subscribers.length === 0) {
      alert("No subscribers available to export.");
      return;
    }

    const headers = ["Email", "Subscribed Date"];
    const rows = subscribers.map((sub) => [
      `"${sub.email}"`,
      `"${new Date(sub.subscribedAt).toLocaleString("en-IN")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `peralagae_subscribers_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAdmin();
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex flex-col font-sans">
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#888888] uppercase tracking-wider">
          <Link href="/admin/dashboard" className="hover:text-[#111111] transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-[#C5A572] font-medium">Subscribers</span>
        </div>

        {/* Header with Title and Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE6DF] pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#1A1A1A] tracking-tight">
              Newsletter Subscribers
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#666666]">
              Real-time directory of customer emails registered via the popup modal or homepage newsletter.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadSubscribers(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wider rounded border border-[#E5E7EB] bg-white text-[#444444] hover:bg-[#F9F9F9] hover:text-[#111111] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C5A572]" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={subscribers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider rounded bg-[#1A1A1A] text-white hover:bg-[#C5A572] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            role="alert"
            className={`flex items-center justify-between p-4 rounded-lg text-xs sm:text-sm border transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[#666666] hover:text-[#111111] text-xs font-semibold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Total Subscribers Summary Card (Active & Inactive cards removed as requested) */}
        <div className="max-w-xs sm:max-w-sm">
          <div className="bg-white rounded-xl border border-[#EAE6DF] p-4 sm:p-5 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#888888]">
                Total Subscribers
              </p>
              <p className="text-2xl font-serif text-[#1A1A1A] mt-1">{totalCount}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#FAF7F2] border border-[#EAE6DF] flex items-center justify-center text-[#C5A572]">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search Bar (Status filter removed as requested) */}
        <div className="bg-white rounded-xl border border-[#EAE6DF] p-4 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by customer email address…"
              className="w-full pl-9 pr-14 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#E5E7EB] rounded-lg text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#888888] hover:text-[#111111] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Subscribers Table Card (Only Email and Subscribed Date) */}
        <div className="bg-white rounded-xl border border-[#EAE6DF] shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#888888]">
              <Loader2 className="w-7 h-7 animate-spin text-[#C5A572]" />
              <p className="text-xs uppercase tracking-wider font-medium">Loading subscriber directory…</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#EAE6DF] mx-auto flex items-center justify-center text-[#C5A572] mb-3">
                <Mail className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-serif text-[#1A1A1A]">No subscribers found</h3>
              <p className="text-xs sm:text-sm text-[#777777] mt-1 max-w-md mx-auto">
                {searchQuery
                  ? "No subscribers match your search. Try resetting your search query."
                  : "Emails entered into the newsletter popup modal or homepage subscription box will appear here automatically."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#EAE6DF] bg-[#FAF9F6] text-[11px] font-medium uppercase tracking-wider text-[#666666]">
                    <th className="py-3 px-4 sm:px-6">Customer Email</th>
                    <th className="py-3 px-4 sm:px-6">Subscribed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECE6]">
                  {subscribers.map((sub, idx) => (
                    <tr
                      key={sub.id || idx}
                      className="hover:bg-[#FAF9F6]/60 transition-colors duration-150"
                    >
                      {/* 1. Customer Email */}
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-[#1A1A1A]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs select-all text-[#111111]">
                            {sub.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(sub.email)}
                            title="Copy email address"
                            className="p-1 text-[#888888] hover:text-[#111111] hover:bg-[#F0ECE6] rounded transition-colors cursor-pointer"
                          >
                            {copiedEmail === sub.email ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Subscribed Date */}
                      <td className="py-3.5 px-4 sm:px-6 text-xs text-[#666666] whitespace-nowrap">
                        {new Date(sub.subscribedAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer with Pagination */}
          {!isLoading && subscribers.length > 0 && (
            <div className="py-3 px-4 sm:px-6 border-t border-[#EAE6DF] bg-[#FAF9F6] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#666666]">
              <p>
                Showing <span className="font-medium text-[#111111]">{subscribers.length}</span> of{" "}
                <span className="font-medium text-[#111111]">{totalCount}</span> total subscribers
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-[#E5E7EB] bg-white text-[#444444] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-medium text-[#1A1A1A]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-[#E5E7EB] bg-white text-[#444444] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
