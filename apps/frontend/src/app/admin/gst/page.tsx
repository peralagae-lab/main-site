"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Calculator,
  ShieldCheck,
  Loader2,
  ChevronRight,
  X,
} from "lucide-react";
import { GstAdminService } from "@/services/gst-admin-service";
import { logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { formatInr } from "@/lib/utils";

const PRESET_RATES = ["3.0", "5.0", "12.0", "18.0"];

export default function AdminGstPage() {
  const [percentage, setPercentage] = useState<string>("3.0");
  const [isInclusive, setIsInclusive] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const [simulationAmount, setSimulationAmount] = useState<number>(100000);

  const fetchGstSettings = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await GstAdminService.getGstSetting();
      setPercentage(String(data.percentage));
      setIsInclusive(data.isInclusive);
      setLastUpdated(data.updatedAt);
      setUpdatedBy(data.updatedBy || null);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load GST settings",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGstSettings();
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsed = Number(percentage);
    if (isNaN(parsed) || parsed < 0) {
      setFeedback({ type: "error", message: "GST percentage must be a valid non-negative number." });
      return;
    }
    if (parsed > 40) {
      setFeedback({
        type: "error",
        message: "GST percentage cannot exceed reasonable statutory maximum of 40%.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await GstAdminService.updateGstSetting({
        percentage: parsed,
        isInclusive,
      });

      setPercentage(String(updated.percentage));
      setIsInclusive(updated.isInclusive);
      setLastUpdated(updated.updatedAt);
      setUpdatedBy(updated.updatedBy || null);
      setFeedback({
        type: "success",
        message: `GST settings saved successfully! Active rate: ${updated.percentage}%.`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update GST setting",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const numericRate = Number(percentage) || 0;
  const previewTax = isInclusive
    ? Math.round((simulationAmount - simulationAmount / (1 + numericRate / 100)) * 100) / 100
    : Math.round((simulationAmount * (numericRate / 100)) * 100) / 100;

  const previewBase = isInclusive ? simulationAmount - previewTax : simulationAmount;
  const previewTotal = isInclusive ? simulationAmount : simulationAmount + previewTax;

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
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 bg-white">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4">
          <Link href="/admin/dashboard" className="hover:text-black transition-colors">
            Admin
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <Link href="/admin/dashboard" className="hover:text-black transition-colors">
            Settings
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-900 font-medium">Global GST</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
                Global GST Settings
              </h1>
              {!isLoading && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
                  Active: {percentage}%
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
              Configure Goods and Services Tax (GST) applied consistently across the storefront,
              checkout, and historical order snapshots.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchGstSettings}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 text-xs font-medium bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Notification Alert */}
        {feedback && (
          <div
            role="alert"
            className={`mt-6 p-4 rounded-lg text-sm flex items-center justify-between gap-3 border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form & Simulator Grid */}
        {isLoading ? (
          <div className="mt-8 py-20 text-center bg-white border border-neutral-200 rounded-xl">
            <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mx-auto mb-2.5" />
            <p className="text-sm text-neutral-600">Loading GST settings...</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Tax Rate Settings */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-xl border border-neutral-200 space-y-6">
              <div className="pb-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Statutory Tax Rate
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Set the active GST percentage applied at checkout.
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700">
                  <Percent className="w-4 h-4" />
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {/* Rate Input */}
                <div>
                  <label
                    htmlFor="gst-rate-input"
                    className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
                  >
                    GST Rate Percentage (%) *
                  </label>
                  <div className="relative">
                    <input
                      id="gst-rate-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="40"
                      required
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      placeholder="e.g. 3.0"
                      className="w-full h-11 pl-3.5 pr-10 text-base font-semibold bg-white border border-neutral-300 rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    Standard gold and fine jewellery GST in India is <span className="font-semibold text-neutral-900">3%</span>.
                  </p>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                    Standard Presets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_RATES.map((rate) => {
                      const isSelected = Number(percentage) === Number(rate);
                      return (
                        <button
                          type="button"
                          key={rate}
                          onClick={() => setPercentage(rate)}
                          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-neutral-900 text-white border-neutral-900"
                              : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          {rate}% {rate === "3.0" && "(Gold & Gems)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tax Treatment Option */}
                <div className="p-4 rounded-lg border border-neutral-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Tax Treatment
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                      Retail Standard
                    </span>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <input
                      type="radio"
                      name="isInclusive"
                      checked={isInclusive}
                      onChange={() => setIsInclusive(true)}
                      className="mt-0.5 h-4 w-4 text-black accent-black cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">
                        GST-Inclusive Display Prices
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                        Catalogued jewellery prices in the storefront already include this GST rate.
                        The tax amount is extracted and shown transparently in the receipt.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Audit Timestamps */}
                {lastUpdated && (
                  <div className="text-xs text-neutral-400 space-y-0.5 pt-1">
                    <p>
                      Last updated:{" "}
                      {new Date(lastUpdated).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {updatedBy && <p>Updated by: {updatedBy}</p>}
                  </div>
                )}

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 py-2.5 bg-neutral-900 hover:bg-[#C5A572] active:bg-[#B3935F] text-white text-xs font-medium uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save GST Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Calculator & Protection Notice */}
            <div className="lg:col-span-5 space-y-6">
              {/* Simulator Card */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                      Live Calculation Simulator
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-neutral-600">
                    {numericRate}%
                  </span>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5">
                    Simulated Retail Price (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1000"
                      value={simulationAmount}
                      onChange={(e) => setSimulationAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 pl-7 pr-3 text-sm font-semibold bg-white border border-neutral-200 rounded-lg outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                {/* Calculation Table */}
                <div className="space-y-2.5 pt-2 text-xs border-t border-neutral-100">
                  <div className="flex justify-between text-neutral-600">
                    <span>Item Base Value:</span>
                    <span className="font-semibold text-neutral-900">{formatInr(previewBase)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>GST ({numericRate}%):</span>
                    <span className="font-semibold text-neutral-900">{formatInr(previewTax)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                    <span>Customer Pays:</span>
                    <span className="text-base">{formatInr(previewTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Historical Integrity Note */}
              <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-neutral-700" />
                  <span>Historical Snapshot Integrity</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Updating this GST percentage does not silently alter base product prices in MongoDB,
                  nor does it recalculate historical orders. Every order stores an immutable snapshot of
                  the GST rate and calculated tax at the moment of checkout.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
