"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { logoutAdmin } from "@/services/admin-auth-service";
import {
  fetchAdminContactEnquiries,
  updateAdminContactStatus,
  type ContactEnquiryRecord,
  type ContactEnquiryStatus,
  type ContactCounts,
} from "@/services/contact-service";

export default function AdminContactPage() {
  const [activeTab, setActiveTab] = useState<ContactEnquiryStatus>("non-contact");
  const [enquiries, setEnquiries] = useState<ContactEnquiryRecord[]>([]);
  const [counts, setCounts] = useState<ContactCounts>({
    newContacts: 0,
    contacted: 0,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // User feedback toast / banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load enquiries for the current tab
  const loadEnquiries = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const response = await fetchAdminContactEnquiries(activeTab, 1, 100);
        setEnquiries(response.enquiries || []);
        if (response.counts) {
          setCounts(response.counts);
        }
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to load contact enquiries",
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  // Handle Action Dropdown Change
  const handleStatusChange = async (
    enquiry: ContactEnquiryRecord,
    newStatus: ContactEnquiryStatus
  ) => {
    if (enquiry.status === newStatus) return;

    const previousStatus = enquiry.status;
    setUpdatingId(enquiry.id);

    // 1. Optimistic UI Update: remove from current tab immediately & update counts
    setEnquiries((prev) => prev.filter((item) => item.id !== enquiry.id));
    setCounts((prev) => {
      if (newStatus === "contact") {
        return {
          ...prev,
          newContacts: Math.max(0, prev.newContacts - 1),
          contacted: prev.contacted + 1,
        };
      } else {
        return {
          ...prev,
          newContacts: prev.newContacts + 1,
          contacted: Math.max(0, prev.contacted - 1),
        };
      }
    });

    try {
      const response = await updateAdminContactStatus(enquiry.id, newStatus);
      if (response.counts) {
        setCounts(response.counts);
      }
      setFeedback({
        type: "success",
        message:
          newStatus === "contact"
            ? `Enquiry from ${enquiry.name} marked as Contacted.`
            : `Enquiry from ${enquiry.name} moved to New Contacts.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      // Revert optimistic update on failure
      setEnquiries((prev) => [enquiry, ...prev]);
      setCounts((prev) => {
        if (newStatus === "contact") {
          return {
            ...prev,
            newContacts: prev.newContacts + 1,
            contacted: Math.max(0, prev.contacted - 1),
          };
        } else {
          return {
            ...prev,
            newContacts: Math.max(0, prev.newContacts - 1),
            contacted: prev.contacted + 1,
          };
        }
      });
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to update enquiry status. Please try again.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutAdmin();
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      {/* Top Header Navbar */}
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Slide-out Sidebar Drawer */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-2 text-xs text-[#6B7280] uppercase tracking-wider mb-3 sm:mb-4"
        >
          <Link
            href="/admin/dashboard"
            className="hover:text-[#C5A572] transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-[#9CA3AF]">/</span>
          <span className="text-[#C5A572] font-semibold" aria-current="page">
            Contact
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#111111] font-normal tracking-tight">
              Contact Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#6B7280]">
              Manage and follow up on customer enquiries submitted via the storefront.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadEnquiries(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium uppercase tracking-wider bg-white border border-[#E5E7EB] text-[#374151] rounded-md hover:bg-neutral-50 hover:text-[#C5A572] hover:border-[#C5A572] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C5A572]" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            role="alert"
            aria-live="polite"
            className={`mt-4 p-4 rounded-md flex items-center justify-between text-xs sm:text-sm ${
              feedback.type === "success"
                ? "bg-[#FAF9F5] border border-[#C5A572] text-[#111111]"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#C5A572] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs uppercase tracking-wider text-[#6B7280] hover:text-[#111111] font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two Tabs: New Contacts & Contacted */}
        <div className="mt-6 sm:mt-8 border-b border-[#E5E7EB]">
          <div className="flex space-x-6 sm:space-x-8" role="tablist">
            {/* Tab A: New Contacts */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "non-contact"}
              onClick={() => setActiveTab("non-contact")}
              className={`pb-4 px-1 text-xs sm:text-sm font-medium uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer select-none ${
                activeTab === "non-contact"
                  ? "border-[#C5A572] text-[#111111] font-semibold"
                  : "border-transparent text-[#6B7280] hover:text-[#111111] hover:border-neutral-300"
              }`}
            >
              <span>New Contacts</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  activeTab === "non-contact"
                    ? "bg-[#C5A572] text-white"
                    : "bg-[#E5E7EB] text-[#4B5563]"
                }`}
              >
                {counts.newContacts}
              </span>
            </button>

            {/* Tab B: Contacted */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "contact"}
              onClick={() => setActiveTab("contact")}
              className={`pb-4 px-1 text-xs sm:text-sm font-medium uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer select-none ${
                activeTab === "contact"
                  ? "border-[#C5A572] text-[#111111] font-semibold"
                  : "border-transparent text-[#6B7280] hover:text-[#111111] hover:border-neutral-300"
              }`}
            >
              <span>Contacted</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  activeTab === "contact"
                    ? "bg-[#C5A572] text-white"
                    : "bg-[#E5E7EB] text-[#4B5563]"
                }`}
              >
                {counts.contacted}
              </span>
            </button>
          </div>
        </div>

        {/* Contact Enquiries Table */}
        <div className="mt-6 bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[#6B7280] space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#C5A572] mx-auto" />
              <p className="text-xs uppercase tracking-wider">Loading contact enquiries...</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="py-16 px-4 text-center text-[#6B7280] max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F5] border border-[#C5A572]/40 text-[#C5A572] flex items-center justify-center mx-auto">
                <MessageSquare className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-lg text-[#111111]">
                {activeTab === "non-contact"
                  ? "No New Enquiries"
                  : "No Contacted Enquiries"}
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {activeTab === "non-contact"
                  ? "Newly submitted customer messages will automatically appear here."
                  : "Enquiries that have been marked as Contact will be listed here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    <th scope="col" className="py-3.5 px-4 sm:px-6">
                      Name
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6">
                      Email Address
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6">
                      Phone Number
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6">
                      Message
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-6 text-right sm:text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {enquiries.map((item) => {
                    const isUpdating = updatingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-50/80 transition-colors duration-150"
                      >
                        {/* 1. Name */}
                        <td className="py-4 px-4 sm:px-6 font-medium text-[#111111] whitespace-nowrap">
                          {item.name}
                        </td>

                        {/* 2. Email Address */}
                        <td className="py-4 px-4 sm:px-6 text-[#4B5563] whitespace-nowrap">
                          <a
                            href={`mailto:${item.email}`}
                            className="hover:text-[#C5A572] transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A572]"
                          >
                            {item.email}
                          </a>
                        </td>

                        {/* 3. Phone Number */}
                        <td className="py-4 px-4 sm:px-6 text-[#4B5563] whitespace-nowrap">
                          {item.phone ? (
                            <a
                              href={`tel:${item.phone.replace(/\s+/g, "")}`}
                              className="hover:text-[#C5A572] transition-colors"
                            >
                              {item.phone}
                            </a>
                          ) : (
                            <span className="text-[#9CA3AF]">—</span>
                          )}
                        </td>

                        {/* 4. Message */}
                        <td className="py-4 px-4 sm:px-6 text-[#374151] leading-relaxed max-w-sm sm:max-w-md break-words">
                          {item.message}
                        </td>

                        {/* 5. Action Dropdown (Strictly: Non-Contact & Contact) */}
                        <td className="py-4 px-4 sm:px-6 text-right sm:text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#C5A572]" />
                            ) : (
                              <select
                                aria-label={`Status for ${item.name}`}
                                value={item.status}
                                disabled={isUpdating}
                                onChange={(e) =>
                                  handleStatusChange(
                                    item,
                                    e.target.value as ContactEnquiryStatus
                                  )
                                }
                                className={`text-xs font-medium px-3 py-1.5 rounded border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#C5A572] ${
                                  item.status === "contact"
                                    ? "bg-green-50 text-green-800 border-green-200 hover:border-[#C5A572]"
                                    : "bg-[#FAF9F5] text-[#111111] border-[#E5E7EB] hover:border-[#C5A572]"
                                }`}
                              >
                                <option value="non-contact">Non-Contact</option>
                                <option value="contact">Contact</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
