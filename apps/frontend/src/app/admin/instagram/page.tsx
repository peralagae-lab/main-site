"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Instagram,
  Upload,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  History,
  LayoutTemplate,
  RotateCcw,
  Check,
  ExternalLink,
  Plus,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { getAdminSession, logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminInstagramSection,
  updateAdminInstagramSection,
  fetchAdminInstagramHistory,
  restoreAdminInstagramVersion,
  uploadAdminInstagramImage,
  INSTAGRAM_SECTION_QUERY_KEY,
  INSTAGRAM_SECTION_UPDATED_EVENT,
} from "@/services/instagram-service";
import type {
  InstagramSectionConfig,
  InstagramImageItem,
  InstagramHistoryItem,
} from "@/types/instagram";

interface LocalImageItem extends InstagramImageItem {
  isUploading?: boolean;
}

export default function AdminInstagramPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Auth & Layout
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"gallery" | "history">("gallery");

  // Notifications
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Section State
  const [sectionConfig, setSectionConfig] = useState<InstagramSectionConfig | null>(null);
  const [isLoadingSection, setIsLoadingSection] = useState(true);
  const [heading, setHeading] = useState("Follow Us on Instagram");
  const [handle, setHandle] = useState("@peralagaeofficial");
  const [profileUrl, setProfileUrl] = useState("https://www.instagram.com/peralagaeofficial/");
  const [isSectionActive, setIsSectionActive] = useState(true);
  const [images, setImages] = useState<LocalImageItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);

  // Hidden file inputs
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Version History State
  const [historyList, setHistoryList] = useState<InstagramHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<InstagramHistoryItem | null>(null);

  // Check Admin Session
  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getAdminSession();
        if (!session?.email) {
          router.replace("/admin/login");
          return;
        }
        setIsVerifying(false);
      } catch {
        router.replace("/admin/login");
      }
    }
    checkAuth();
  }, [router]);

  // Load Section Settings
  const loadSectionData = async () => {
    setIsLoadingSection(true);
    try {
      const data = await fetchAdminInstagramSection();
      setSectionConfig(data);
      setHeading(data.heading || "Follow Us on Instagram");
      setHandle(data.handle || "@peralagaeofficial");
      setProfileUrl(data.profileUrl || "https://www.instagram.com/peralagaeofficial/");
      setIsSectionActive(data.isActive ?? true);
      setImages(data.images || []);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load Instagram section configuration.",
      });
    } finally {
      setIsLoadingSection(false);
    }
  };

  // Load Version History
  const loadHistoryData = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchAdminInstagramHistory();
      setHistoryList(data);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load version history.",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!isVerifying) {
      loadSectionData();
    }
  }, [isVerifying]);

  useEffect(() => {
    if (activeTab === "history" && !isVerifying) {
      loadHistoryData();
    }
  }, [activeTab, isVerifying]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAdmin();
      router.replace("/admin/login");
    } catch {
      router.replace("/admin/login");
    }
  };

  // ── Image Manipulation ────────────────────────────────────────────────────

  const handleAddImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAddingImage(true);
    try {
      const uploadRes = await uploadAdminInstagramImage(file);
      const newImage: LocalImageItem = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        imageUrl: uploadRes.imageUrl,
        altText: "PERALAGAE Fine Jewellery Instagram",
        postUrl: "",
        order: images.length,
        isActive: true,
      };

      setImages((prev) => [...prev, newImage]);
      setStatusMessage({
        type: "success",
        text: "Image uploaded and added to draft gallery. Click 'Publish Changes' to make it live on the storefront.",
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload image.",
      });
    } finally {
      setIsAddingImage(false);
      if (addImageInputRef.current) {
        addImageInputRef.current.value = "";
      }
    }
  };

  const handleReplaceImageFile = async (index: number, file: File) => {
    const targetImage = images[index];
    if (!targetImage) return;

    // Mark as uploading
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, isUploading: true } : img))
    );

    try {
      const uploadRes = await uploadAdminInstagramImage(file);
      setImages((prev) =>
        prev.map((img, i) =>
          i === index
            ? {
                ...img,
                imageUrl: uploadRes.imageUrl,
                isUploading: false,
              }
            : img
        )
      );
      setStatusMessage({
        type: "success",
        text: `Image #${index + 1} replaced successfully. Click 'Publish Changes' to persist.`,
      });
    } catch (err: unknown) {
      setImages((prev) =>
        prev.map((img, i) => (i === index ? { ...img, isUploading: false } : img))
      );
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to replace image.",
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    const target = images[index];
    if (!target) return;

    const remaining = images.filter((_, i) => i !== index);
    const reordered = remaining.map((img, i) => ({ ...img, order: i }));
    setImages(reordered);

    setStatusMessage({
      type: "info",
      text: `Image removed from draft. Click 'Publish Changes' to save updates.`,
    });
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((img, i) => ({ ...img, order: i }));
    setImages(updated);
  };

  const handleToggleImageActive = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, isActive: !img.isActive } : img))
    );
  };

  const handleUpdateImageField = (
    index: number,
    field: "postUrl" | "altText",
    value: string
  ) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    );
  };

  // ── Publish Changes ───────────────────────────────────────────────────────

  const handlePublishSection = async () => {
    if (!heading.trim()) {
      setStatusMessage({ type: "error", text: "Section heading cannot be empty." });
      return;
    }
    if (!handle.trim()) {
      setStatusMessage({ type: "error", text: "Instagram handle cannot be empty." });
      return;
    }

    // Validate URLs for unsafe schemes
    const isUnsafeUrl = (url: string | null | undefined) => {
      if (!url) return false;
      const lower = url.trim().toLowerCase();
      return lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:");
    };

    if (isUnsafeUrl(profileUrl)) {
      setStatusMessage({
        type: "error",
        text: "Instagram profile URL contains an unsafe URL scheme.",
      });
      return;
    }

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img && isUnsafeUrl(img.postUrl)) {
        setStatusMessage({
          type: "error",
          text: `Image #${i + 1} destination link contains an unsafe URL scheme.`,
        });
        return;
      }
    }

    setIsPublishing(true);
    try {
      const payloadImages = images.map((img, idx) => ({
        id: img.id.startsWith("temp_") ? undefined : img.id,
        imageUrl: img.imageUrl,
        altText: img.altText || null,
        postUrl: img.postUrl?.trim() || null,
        order: idx,
        isActive: img.isActive,
      }));

      const updated = await updateAdminInstagramSection({
        heading: heading.trim(),
        handle: handle.trim(),
        profileUrl: profileUrl.trim() || null,
        isActive: isSectionActive,
        images: payloadImages,
      });

      setSectionConfig(updated);
      setImages(updated.images || []);
      setStatusMessage({
        type: "success",
        text: `Instagram Section published successfully as Version ${updated.version}! Storefront is updated.`,
      });
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_SECTION_QUERY_KEY });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("peralagae:instagram_updated_at", String(Date.now()));
        } catch {}
        window.dispatchEvent(new CustomEvent(INSTAGRAM_SECTION_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to publish Instagram section changes.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Restore Version ───────────────────────────────────────────────────────

  const handleRestoreVersion = async (item: InstagramHistoryItem) => {
    setRestoringVersionId(item.id);
    try {
      const restored = await restoreAdminInstagramVersion(item.id);
      setSectionConfig(restored);
      setHeading(restored.heading || "Follow Us on Instagram");
      setHandle(restored.handle || "@peralagaeofficial");
      setProfileUrl(restored.profileUrl || "");
      setIsSectionActive(restored.isActive ?? true);
      setImages(restored.images || []);
      setConfirmRestoreItem(null);
      setActiveTab("gallery");
      setStatusMessage({
        type: "success",
        text: `Successfully restored Instagram Section from Version ${item.version}!`,
      });
      queryClient.invalidateQueries({ queryKey: INSTAGRAM_SECTION_QUERY_KEY });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("peralagae:instagram_updated_at", String(Date.now()));
        } catch {}
        window.dispatchEvent(new CustomEvent(INSTAGRAM_SECTION_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to restore version snapshot.",
      });
    } finally {
      setRestoringVersionId(null);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#C5A572]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col font-sans">
      <AdminNavbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="p-2 bg-black text-[#C5A572] rounded-md shadow-sm shrink-0">
                <Instagram className="w-5 h-5 stroke-[1.75]" />
              </span>
              <h1 className="text-lg sm:text-2xl font-light tracking-[0.05em] uppercase text-[#111111] break-words">
                Instagram Section Management
              </h1>
              {sectionConfig && (
                <span className="px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded-full bg-[#F5F5F5] border border-[#E0E0E0] text-[#555555]">
                  v{sectionConfig.version}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#666666]">
              Manage the homepage &ldquo;Follow Us on Instagram&rdquo; gallery, handle, destinations, and version history.
            </p>
          </div>

          {/* Tab Navigation Controls */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-lg shadow-sm w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("gallery")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-medium tracking-wider uppercase rounded-md transition-colors min-h-[40px] sm:min-h-0 ${
                activeTab === "gallery"
                  ? "bg-black text-white shadow-sm"
                  : "text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Gallery &amp; Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-medium tracking-wider uppercase rounded-md transition-colors min-h-[40px] sm:min-h-0 ${
                activeTab === "history"
                  ? "bg-black text-white shadow-sm"
                  : "text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Version History</span>
            </button>
          </div>
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`mt-4 p-3.5 sm:p-4 rounded-md flex items-start justify-between gap-3 text-xs sm:text-sm transition-all duration-300 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="font-medium break-words">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[#666666] hover:text-[#111111] p-1 min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── TAB 1: GALLERY & SECTION SETTINGS ──────────────────────────────── */}
        {activeTab === "gallery" && (
          <div className="mt-6 space-y-6 sm:space-y-8">
            {isLoadingSection ? (
              <div className="flex flex-col items-center justify-center p-12 sm:p-16 bg-white border border-[#E5E7EB] rounded-lg">
                <Loader2 className="w-7 h-7 animate-spin text-[#C5A572]" />
                <p className="mt-3 text-xs text-[#888888] uppercase tracking-wider">
                  Loading Instagram settings...
                </p>
              </div>
            ) : (
              <>
                {/* Section Global Settings Card */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-4 sm:p-6 md:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-[#C5A572] shrink-0" />
                      <h2 className="text-sm font-semibold tracking-wider uppercase text-[#111111]">
                        Section Configuration
                      </h2>
                    </div>

                    {/* Section Active Toggle */}
                    <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto p-2 sm:p-0 bg-gray-50 sm:bg-transparent rounded-md">
                      <span className="text-xs font-medium text-[#666666]">
                        Storefront Visibility:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSectionActive((prev) => !prev)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A572] focus:ring-offset-2 ${
                            isSectionActive ? "bg-black" : "bg-gray-200"
                          }`}
                          role="switch"
                          aria-checked={isSectionActive}
                          aria-label="Toggle section storefront visibility"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isSectionActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider min-w-[50px] ${
                            isSectionActive ? "text-emerald-700" : "text-gray-400"
                          }`}
                        >
                          {isSectionActive ? "Active" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Section Heading */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider uppercase text-[#333333] mb-1.5 sm:mb-2">
                        Section Heading <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={heading}
                        onChange={(e) => setHeading(e.target.value)}
                        placeholder="e.g. Follow Us on Instagram"
                        className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-base sm:text-sm text-[#111111] focus:bg-white focus:outline-none focus:border-[#C5A572] transition-colors min-h-[42px]"
                      />
                      <p className="mt-1.5 text-[11px] text-[#888888]">
                        Displayed prominently above the gallery.
                      </p>
                    </div>

                    {/* Instagram Handle */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider uppercase text-[#333333] mb-1.5 sm:mb-2">
                        Instagram Handle <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="e.g. @peralagaeofficial"
                        className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-base sm:text-sm text-[#111111] focus:bg-white focus:outline-none focus:border-[#C5A572] transition-colors min-h-[42px]"
                      />
                      <p className="mt-1.5 text-[11px] text-[#888888]">
                        Clickable handle displayed beneath the heading.
                      </p>
                    </div>

                    {/* Profile URL */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider uppercase text-[#333333] mb-1.5 sm:mb-2">
                        Profile URL
                      </label>
                      <input
                        type="url"
                        value={profileUrl}
                        onChange={(e) => setProfileUrl(e.target.value)}
                        placeholder="e.g. https://www.instagram.com/peralagaeofficial/"
                        className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-base sm:text-sm text-[#111111] focus:bg-white focus:outline-none focus:border-[#C5A572] transition-colors min-h-[42px]"
                      />
                      <p className="mt-1.5 text-[11px] text-[#888888]">
                        Fallback link when an individual image has no custom destination.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image Management Section */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-4 sm:p-6 md:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F0F0F0]">
                    <div>
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-[#C5A572]" />
                        <h2 className="text-sm font-semibold tracking-wider uppercase text-[#111111]">
                          Gallery Images ({images.length})
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-[#666666]">
                        Upload, reorder, link, or disable images. Storefront dynamically displays all active images in their saved order.
                      </p>
                    </div>

                    {/* Add Image File Trigger */}
                    <div className="w-full sm:w-auto">
                      <input
                        ref={addImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAddImageFile}
                        className="hidden"
                        id="add-instagram-image-input"
                      />
                      <button
                        type="button"
                        onClick={() => addImageInputRef.current?.click()}
                        disabled={isAddingImage}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black hover:bg-[#222222] text-[#C5A572] hover:text-[#D4AF37] text-xs font-semibold tracking-wider uppercase rounded-md transition-all shadow-sm disabled:opacity-50 min-h-[42px]"
                      >
                        {isAddingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Add New Image</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Images Grid */}
                  {images.length === 0 ? (
                    <div className="mt-8 p-6 sm:p-12 text-center border-2 border-dashed border-[#E5E7EB] rounded-lg bg-[#FAFAFA]">
                      <Instagram className="w-10 h-10 mx-auto text-[#BBBBBB]" />
                      <h3 className="mt-3 text-sm font-medium text-[#111111] uppercase tracking-wider">
                        No Images in Gallery
                      </h3>
                      <p className="mt-1 text-xs text-[#777777] max-w-sm mx-auto">
                        Your Instagram section currently has no images. Click &ldquo;Add New Image&rdquo; above to upload jewellery visuals directly from your device.
                      </p>
                      <button
                        type="button"
                        onClick={() => addImageInputRef.current?.click()}
                        className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-[#C5A572] text-xs font-semibold tracking-wider uppercase rounded-md hover:bg-[#222222] min-h-[42px]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload First Image</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {images.map((img, idx) => {
                        return (
                          <div
                            key={img.id || `idx_${idx}`}
                            className={`border rounded-lg bg-[#FCFCFC] transition-all shadow-2xs flex flex-col ${
                              img.isActive ? "border-[#E5E7EB]" : "border-dashed border-gray-300 opacity-75"
                            }`}
                          >
                            {/* Card Header & Controls */}
                            <div className="p-3 bg-white border-b border-[#F0F0F0] flex items-center justify-between rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-[#111111] text-[#C5A572] rounded-full">
                                  #{idx + 1}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                                    img.isActive
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-gray-100 text-gray-500 border border-gray-200"
                                  }`}
                                >
                                  {img.isActive ? "Active" : "Hidden"}
                                </span>
                              </div>

                              {/* Reordering Controls */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, "left")}
                                  disabled={idx === 0}
                                  title="Move Left"
                                  className="min-w-[38px] min-h-[38px] p-2 flex items-center justify-center text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, "right")}
                                  disabled={idx === images.length - 1}
                                  title="Move Right"
                                  className="min-w-[38px] min-h-[38px] p-2 flex items-center justify-center text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md disabled:opacity-30 disabled:hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Image Thumbnail Preview */}
                            <div className="relative aspect-square w-full bg-[#F5F5F5] overflow-hidden group">
                              <Image
                                src={img.imageUrl}
                                alt={img.altText || `Instagram photo ${idx + 1}`}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                unoptimized={img.imageUrl.startsWith("http://localhost") || img.imageUrl.startsWith("/api")}
                              />

                              {img.isUploading && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                                  <Loader2 className="w-6 h-6 animate-spin text-[#C5A572]" />
                                  <span className="mt-2 text-xs font-medium tracking-wider uppercase">
                                    Uploading...
                                  </span>
                                </div>
                              )}

                              {/* Hover Action Overlay (Desktop) */}
                              <div className="hidden sm:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2 p-4">
                                <button
                                  type="button"
                                  onClick={() => replaceInputRefs.current[img.id]?.click()}
                                  className="px-3 py-1.5 bg-white text-black hover:bg-[#F5F5F5] text-xs font-semibold rounded uppercase tracking-wider shadow"
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold rounded uppercase tracking-wider shadow"
                                >
                                  Remove
                                </button>
                              </div>

                              {/* Hidden Replace Input */}
                              <input
                                ref={(el) => {
                                  replaceInputRefs.current[img.id] = el;
                                }}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleReplaceImageFile(idx, file);
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </div>

                            {/* Mobile Action Bar (Touch Friendly - visible on < sm screens) */}
                            <div className="sm:hidden flex items-center justify-between gap-2 p-2 bg-gray-50 border-b border-[#F0F0F0]">
                              <button
                                type="button"
                                onClick={() => replaceInputRefs.current[img.id]?.click()}
                                className="flex-1 py-2 px-3 bg-white border border-gray-300 hover:bg-gray-100 text-[#222222] text-xs font-semibold rounded uppercase tracking-wider min-h-[38px] flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Replace</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="flex-1 py-2 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded uppercase tracking-wider min-h-[38px] flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>

                            {/* Card Content & Fields */}
                            <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                              <div className="space-y-2.5">
                                {/* Destination URL */}
                                <div>
                                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                                    Destination Link (Optional)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="url"
                                      value={img.postUrl || ""}
                                      onChange={(e) =>
                                        handleUpdateImageField(idx, "postUrl", e.target.value)
                                      }
                                      placeholder="e.g. https://instagram.com/p/... or /products"
                                      className="w-full px-3 py-2.5 text-base sm:text-xs bg-white border border-[#D5D5D5] rounded text-[#222222] focus:outline-none focus:border-[#C5A572] min-h-[40px] sm:min-h-0"
                                    />
                                    {img.postUrl && (
                                      <a
                                        href={img.postUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Preview Link"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1.5"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Alt Text */}
                                <div>
                                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#555555] mb-1">
                                    Alt Text
                                  </label>
                                  <input
                                    type="text"
                                    value={img.altText || ""}
                                    onChange={(e) =>
                                      handleUpdateImageField(idx, "altText", e.target.value)
                                    }
                                    placeholder="Image description for accessibility"
                                    className="w-full px-3 py-2.5 text-base sm:text-xs bg-white border border-[#D5D5D5] rounded text-[#222222] focus:outline-none focus:border-[#C5A572] min-h-[40px] sm:min-h-0"
                                  />
                                </div>
                              </div>

                              {/* Visibility & Card Actions Footer */}
                              <div className="pt-3 border-t border-[#EFEFEF] flex flex-wrap items-center justify-between gap-2">
                                <label className="inline-flex items-center gap-2.5 cursor-pointer py-1 min-h-[36px]">
                                  <input
                                    type="checkbox"
                                    checked={img.isActive}
                                    onChange={() => handleToggleImageActive(idx)}
                                    className="rounded border-gray-300 text-[#C5A572] focus:ring-[#C5A572] w-4 h-4"
                                  />
                                  <span className="text-xs font-medium text-[#555555]">
                                    {img.isActive ? "Visible" : "Disabled"}
                                  </span>
                                </label>

                                <div className="hidden sm:flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => replaceInputRefs.current[img.id]?.click()}
                                    className="px-2.5 py-1 text-xs text-[#555555] hover:text-black bg-white hover:bg-gray-100 border border-gray-200 rounded uppercase tracking-wider min-h-[32px] inline-flex items-center"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx)}
                                    className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 rounded uppercase tracking-wider min-h-[32px] inline-flex items-center"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Sticky / Dedicated Publish Bar */}
                  <div className="mt-8 pt-4 sm:pt-6 border-t border-[#F0F0F0] sticky bottom-0 z-20 bg-white/95 backdrop-blur-md -mx-3.5 sm:mx-0 px-3.5 sm:px-0 py-3 sm:py-0 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-b-lg">
                    <div className="text-xs text-[#777777] text-center sm:text-left">
                      <span className="font-semibold text-[#111111]">
                        {images.filter((i) => i.isActive).length}
                      </span>{" "}
                      active of {images.length} images will be displayed on the storefront.
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={loadSectionData}
                        disabled={isPublishing}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#D5D5D5] text-[#444444] hover:bg-gray-50 text-xs font-semibold tracking-wider uppercase rounded-md transition-colors disabled:opacity-50 min-h-[42px]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Discard Changes</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePublishSection}
                        disabled={isPublishing}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-black hover:bg-[#222222] text-[#C5A572] hover:text-[#D4AF37] text-xs font-semibold tracking-wider uppercase rounded-md shadow-md transition-all disabled:opacity-50 min-h-[44px]"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Publishing Changes...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save &amp; Publish Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 2: VERSION HISTORY ────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="mt-6 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-4 sm:p-6 md:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F0F0F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#C5A572]" />
                    <h2 className="text-sm font-semibold tracking-wider uppercase text-[#111111]">
                      Publication History &amp; Snapshots
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-[#666666]">
                    Every published update creates an immutable version snapshot. Restore any prior version instantly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadHistoryData}
                  disabled={isLoadingHistory}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-[#D5D5D5] text-[#444444] hover:bg-gray-50 text-xs font-semibold uppercase tracking-wider rounded transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                  <span>Refresh History</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center p-12 sm:p-16">
                  <Loader2 className="w-7 h-7 animate-spin text-[#C5A572]" />
                  <p className="mt-3 text-xs text-[#888888] uppercase tracking-wider">
                    Loading version history...
                  </p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#777777]">
                  No version history snapshots found.
                </div>
              ) : (
                <div className="mt-6 divide-y divide-[#F0F0F0]">
                  {historyList.map((item) => {
                    const isCurrent = sectionConfig?.version === item.version;
                    return (
                      <div
                        key={item.id}
                        className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFAFA] p-3 rounded-md transition-colors"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-[#111111]">
                              Version {item.version}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Current Live
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                                item.isActive
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {item.isActive ? "Section Active" : "Section Hidden"}
                            </span>
                          </div>

                          <div className="text-xs text-[#666666] flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="break-all sm:break-normal">
                              <strong>Heading:</strong> &ldquo;{item.heading}&rdquo;
                            </span>
                            <span>
                              <strong>Handle:</strong> {item.handle}
                            </span>
                            <span>
                              <strong>Images:</strong> {item.imagesCount}
                            </span>
                            <span>
                              <strong>Published:</strong>{" "}
                              {new Date(item.createdAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {item.createdBy && (
                              <span>
                                <strong>By:</strong> {item.createdBy}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-full md:w-auto shrink-0">
                          {isCurrent ? (
                            <span className="text-xs text-[#888888] italic block md:inline text-right md:text-left">
                              Active Configuration
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreItem(item)}
                              disabled={restoringVersionId === item.id}
                              className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-[#C5A572] text-[#9A7B38] hover:bg-[#FAF6EE] text-xs font-semibold tracking-wider uppercase rounded transition-colors disabled:opacity-50 min-h-[42px]"
                            >
                              {restoringVersionId === item.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Restoring...</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore v{item.version}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Restore Confirmation Modal ─────────────────────────────────────── */}
      {confirmRestoreItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-md w-full p-5 sm:p-6 shadow-xl border border-[#E5E7EB]">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold text-[#111111]">
                Restore Version {confirmRestoreItem.version}?
              </h3>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Restoring this version will replace the current storefront Instagram section heading, handle, destination links, and {confirmRestoreItem.imagesCount} images with the snapshot recorded on{" "}
              <strong>
                {new Date(confirmRestoreItem.createdAt).toLocaleString()}
              </strong>
              . A new publication version will be created to preserve historical continuity.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setConfirmRestoreItem(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-[#555555] hover:text-black hover:bg-gray-100 rounded transition-colors uppercase tracking-wider min-h-[42px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestoreVersion(confirmRestoreItem)}
                className="w-full sm:w-auto px-5 py-2.5 bg-black hover:bg-[#222222] text-[#C5A572] text-xs font-semibold rounded uppercase tracking-wider shadow transition-colors min-h-[42px] flex items-center justify-center"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
