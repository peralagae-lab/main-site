"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  Gem,
  History,
  LayoutTemplate,
  RotateCcw,
  Eye,
  Check,
} from "lucide-react";
import { getAdminSession, logoutAdmin } from "@/services/admin-auth-service";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  fetchAdminMaterials,
  createAdminMaterial,
  updateAdminMaterial,
  deleteAdminMaterial,
  reorderAdminMaterials,
  fetchAdminMaterialSection,
  updateAdminMaterialSection,
  fetchAdminMaterialSectionHistory,
  restoreAdminMaterialSectionVersion,
  uploadAdminMaterialImage,
  MATERIALS_QUERY_KEY,
  MATERIAL_SECTION_QUERY_KEY,
  MATERIALS_UPDATED_EVENT,
  MATERIAL_SECTION_UPDATED_EVENT,
} from "@/services/material-service";
import type {
  MaterialItem,
  MaterialSectionConfig,
  MaterialCardConfig,
  MaterialSectionHistoryItem,
} from "@/types/material";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminMaterialsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Authentication & Layout state
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active Tab: "materials" | "section" | "history"
  const [activeTab, setActiveTab] = useState<"materials" | "section" | "history">("materials");

  // Status Message
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // ── Tab 1: Materials Management State ─────────────────────────────────────
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Material Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addIsActive, setAddIsActive] = useState(true);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Material Modal
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConflictError, setDeleteConflictError] = useState<string | null>(null);

  // ── Tab 2: Homepage Materials Section State ───────────────────────────────
  const [sectionConfig, setSectionConfig] = useState<MaterialSectionConfig | null>(null);
  const [isLoadingSection, setIsLoadingSection] = useState(false);
  const [sectionHeading, setSectionHeading] = useState("");
  const [cards, setCards] = useState<MaterialCardConfig[]>([]);
  const [isPublishingSection, setIsPublishingSection] = useState(false);

  // Card Add / Edit Modal State
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardCtaText, setCardCtaText] = useState("EXPLORE NOW");
  const [cardImageUrl, setCardImageUrl] = useState("");
  const [cardImageAlt, setCardImageAlt] = useState("");
  const [cardMaterialId, setCardMaterialId] = useState<string>("");
  const [cardIsActive, setCardIsActive] = useState(true);
  const [isUploadingCardImage, setIsUploadingCardImage] = useState(false);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  // ── Tab 3: Version History State ──────────────────────────────────────────
  const [historyList, setHistoryList] = useState<MaterialSectionHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<MaterialSectionHistoryItem | null>(null);

  // Verify Admin Session on mount
  useEffect(() => {
    let isMounted = true;
    getAdminSession()
      .then((session) => {
        if (!isMounted) return;
        if (!session) {
          router.replace("/admin/login");
        } else {
          setIsVerifying(false);
        }
      })
      .catch(() => {
        if (isMounted) router.replace("/admin/login");
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load Materials
  const loadMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const data = await fetchAdminMaterials();
      setMaterials(data);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load materials.",
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Load Section Settings
  const loadSectionSettings = async () => {
    setIsLoadingSection(true);
    try {
      const data = await fetchAdminMaterialSection();
      setSectionConfig(data);
      setSectionHeading(data.heading);
      setCards(data.cards || []);
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load materials section settings.",
      });
    } finally {
      setIsLoadingSection(false);
    }
  };

  // Load History
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchAdminMaterialSectionHistory();
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
      loadMaterials();
      loadSectionSettings();
    }
  }, [isVerifying]);

  useEffect(() => {
    if (activeTab === "history" && !isVerifying) {
      loadHistory();
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

  // Filtered materials for search
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase().trim();
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [materials, searchQuery]);

  // ── Material Actions ──────────────────────────────────────────────────────

  const handleOpenAddModal = () => {
    setAddName("");
    setAddDescription("");
    setAddIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setStatusMessage({ type: "error", text: "Material name is required." });
      return;
    }

    setIsSubmittingAdd(true);
    try {
      await createAdminMaterial({
        name: addName.trim(),
        description: addDescription.trim() || undefined,
        isActive: addIsActive,
      });

      setStatusMessage({ type: "success", text: `Material "${addName.trim()}" created successfully.` });
      setIsAddModalOpen(false);
      await loadMaterials();
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create material.",
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEditModal = (material: MaterialItem) => {
    setEditingMaterial(material);
    setEditName(material.name);
    setEditDescription(material.description || "");
    setEditIsActive(material.isActive);
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    if (!editName.trim()) {
      setStatusMessage({ type: "error", text: "Material name cannot be empty." });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await updateAdminMaterial(editingMaterial.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        isActive: editIsActive,
      });

      setStatusMessage({ type: "success", text: `Material "${editName.trim()}" updated successfully.` });
      setEditingMaterial(null);
      await loadMaterials();
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update material.",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleActiveMaterial = async (material: MaterialItem) => {
    try {
      await updateAdminMaterial(material.id, { isActive: !material.isActive });
      setMaterials((prev) =>
        prev.map((m) => (m.id === material.id ? { ...m, isActive: !m.isActive } : m))
      );
      setStatusMessage({
        type: "success",
        text: `Material "${material.name}" set to ${!material.isActive ? "Active" : "Inactive"}.`,
      });
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update material status.",
      });
    }
  };

  const handleOpenDeleteModal = (material: MaterialItem) => {
    setDeletingMaterial(material);
    setDeleteConflictError(null);
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial) return;
    setIsDeleting(true);
    setDeleteConflictError(null);

    try {
      await deleteAdminMaterial(deletingMaterial.id);
      setStatusMessage({
        type: "success",
        text: `Material "${deletingMaterial.name}" deleted successfully.`,
      });
      setDeletingMaterial(null);
      await loadMaterials();
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }
    } catch (err: any) {
      if (err.code === "MATERIAL_IN_USE") {
        setDeleteConflictError(err.message);
      } else {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to delete material.",
        });
        setDeletingMaterial(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveMaterial = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= materials.length) return;

    const reordered = [...materials];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setMaterials(reordered);

    try {
      await reorderAdminMaterials(reordered.map((m) => m.id));
      queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIALS_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to reorder materials.",
      });
      await loadMaterials();
    }
  };

  // ── Tab 2: Homepage Section Actions ───────────────────────────────────────

  const handleOpenAddCardModal = () => {
    setEditingCardIndex(null);
    setCardTitle("");
    setCardDescription("");
    setCardCtaText("EXPLORE NOW");
    setCardImageUrl("");
    setCardImageAlt("");
    setCardMaterialId(materials[0]?.id || "");
    setCardIsActive(true);
    setIsCardModalOpen(true);
  };

  const handleOpenEditCardModal = (card: MaterialCardConfig, index: number) => {
    setEditingCardIndex(index);
    setCardTitle(card.title);
    setCardDescription(card.description);
    setCardCtaText(card.ctaText || "EXPLORE NOW");
    setCardImageUrl(card.imageUrl);
    setCardImageAlt(card.imageAlt || "");
    setCardMaterialId(card.materialId || "");
    setCardIsActive(card.isActive);
    setIsCardModalOpen(true);
  };

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCardImage(true);
    try {
      const res = await uploadAdminMaterialImage(file);
      setCardImageUrl(res.imageUrl);
      setStatusMessage({ type: "success", text: "Image uploaded and stored durably in MongoDB." });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload image.",
      });
    } finally {
      setIsUploadingCardImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim()) {
      setStatusMessage({ type: "error", text: "Card title is required." });
      return;
    }
    if (!cardDescription.trim()) {
      setStatusMessage({ type: "error", text: "Card description is required." });
      return;
    }
    if (!cardImageUrl.trim()) {
      setStatusMessage({ type: "error", text: "Card image is required. Please upload an image from your device." });
      return;
    }

    const assignedMaterial = materials.find((m) => m.id === cardMaterialId) || null;

    const newCard: MaterialCardConfig = {
      id: editingCardIndex !== null && cards[editingCardIndex] ? cards[editingCardIndex].id : `temp-${Date.now()}`,
      title: cardTitle.trim(),
      description: cardDescription.trim(),
      ctaText: (cardCtaText.trim() || "EXPLORE NOW").toUpperCase(),
      imageUrl: cardImageUrl.trim(),
      imageAlt: cardImageAlt.trim() || cardTitle.trim(),
      materialId: cardMaterialId || null,
      material: assignedMaterial
        ? {
            id: assignedMaterial.id,
            name: assignedMaterial.name,
            slug: assignedMaterial.slug,
            isActive: assignedMaterial.isActive,
          }
        : null,
      order: editingCardIndex !== null ? editingCardIndex : cards.length,
      isActive: cardIsActive,
    };

    if (editingCardIndex !== null) {
      setCards((prev) => prev.map((c, idx) => (idx === editingCardIndex ? newCard : c)));
    } else {
      setCards((prev) => [...prev, newCard]);
    }

    setIsCardModalOpen(false);
  };

  const handleDeleteCard = (index: number) => {
    setCards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveCard = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;

    const reordered = [...cards];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    // Update order property
    const updated = reordered.map((c, i) => ({ ...c, order: i }));
    setCards(updated);
  };

  const handlePublishSection = async () => {
    if (!sectionHeading.trim()) {
      setStatusMessage({ type: "error", text: "Section heading cannot be empty." });
      return;
    }

    setIsPublishingSection(true);
    try {
      const updated = await updateAdminMaterialSection({
        heading: sectionHeading.trim(),
        cards,
      });

      setSectionConfig(updated);
      setCards(updated.cards || []);
      setStatusMessage({
        type: "success",
        text: `Materials Section published successfully as Version ${updated.version}!`,
      });
      queryClient.invalidateQueries({ queryKey: MATERIAL_SECTION_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIAL_SECTION_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to publish materials section.",
      });
    } finally {
      setIsPublishingSection(false);
    }
  };

  // ── Tab 3: Restore Actions ────────────────────────────────────────────────

  const handleRestoreVersion = async (item: MaterialSectionHistoryItem) => {
    setRestoringVersionId(item.id);
    try {
      const restored = await restoreAdminMaterialSectionVersion(item.id);
      setSectionConfig(restored);
      setSectionHeading(restored.heading);
      setCards(restored.cards || []);
      setConfirmRestoreItem(null);
      setStatusMessage({
        type: "success",
        text: `Successfully restored Materials Section from Version ${item.version}!`,
      });
      setActiveTab("section");
      queryClient.invalidateQueries({ queryKey: MATERIAL_SECTION_QUERY_KEY });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(MATERIAL_SECTION_UPDATED_EVENT));
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to restore version.",
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-black text-[#C5A572] rounded-md shadow-sm">
                <Gem className="w-5 h-5 stroke-[1.75]" />
              </span>
              <h1 className="text-xl sm:text-2xl font-light tracking-[0.05em] uppercase text-[#111111]">
                Materials Management
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#666666]">
              Manage fine jewellery materials catalogue, storefront filters, and dynamic homepage editorial cards.
            </p>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E5E7EB] rounded-lg shadow-sm w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("materials")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-medium tracking-wider uppercase rounded-md transition-colors min-h-[38px] sm:min-h-0 ${
                activeTab === "materials"
                  ? "bg-black text-white shadow-sm"
                  : "text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              <Gem className="w-3.5 h-3.5" />
              <span>Catalogue</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("section")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-medium tracking-wider uppercase rounded-md transition-colors min-h-[38px] sm:min-h-0 ${
                activeTab === "section"
                  ? "bg-black text-white shadow-sm"
                  : "text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Homepage Section</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 sm:py-1.5 text-xs font-medium tracking-wider uppercase rounded-md transition-colors min-h-[38px] sm:min-h-0 ${
                activeTab === "history"
                  ? "bg-black text-white shadow-sm"
                  : "text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Version History</span>
            </button>
          </div>
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`mt-4 p-4 rounded-md flex items-start justify-between gap-3 text-xs sm:text-sm transition-all duration-300 ${
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
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[#666666] hover:text-[#111111] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── TAB 1: MATERIALS CATALOGUE ────────────────────────────────────── */}
        {activeTab === "materials" && (
          <div className="mt-6 space-y-6">
            {/* Search and Add Material Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
                <input
                  type="text"
                  placeholder="Search materials by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] rounded-md text-xs sm:text-sm font-medium tracking-wider uppercase transition-colors shadow-sm min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Material</span>
              </button>
            </div>

            {/* Materials Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
              {isLoadingMaterials ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C5A572]" />
                  <span className="text-xs tracking-wider uppercase">Loading materials from database...</span>
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="py-16 text-center text-[#666666]">
                  <Gem className="w-10 h-10 mx-auto text-[#CCCCCC] stroke-[1.25] mb-2" />
                  <p className="text-sm font-medium text-[#111111]">No materials found</p>
                  <p className="text-xs mt-1 text-[#888888]">
                    {searchQuery ? "Try refining your search query." : "Click 'Add Material' to create your first catalogue material."}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="sm:hidden px-4 py-2 bg-amber-50/70 border-b border-amber-100/80 text-[11px] text-amber-900 flex items-center justify-between">
                    <span>Scroll horizontally to view actions &amp; status</span>
                    <span className="font-semibold text-amber-700">Swipe &rarr;</span>
                  </div>
                  <div className="overflow-x-auto overscroll-x-contain">
                    <table className="w-full min-w-[640px] text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-medium uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4 w-12 text-center">#</th>
                          <th className="py-3 px-4">Material</th>
                          <th className="py-3 px-4">Assigned Products</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-center">Order</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredMaterials.map((mat, index) => (
                          <tr key={mat.id} className="hover:bg-[#F9F9F9] transition-colors">
                            <td className="py-3 px-4 text-center text-[#888888] font-mono text-xs">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#111111]">{mat.name}</div>
                              {mat.description && (
                                <div className="text-[11px] text-[#888888] line-clamp-1 max-w-sm mt-0.5">
                                  {mat.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  mat.productCount > 0
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                {mat.productCount} {mat.productCount === 1 ? "Product" : "Products"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleActiveMaterial(mat)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium uppercase tracking-wider transition-colors min-h-[32px] ${
                                  mat.isActive
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 border border-neutral-300"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    mat.isActive ? "bg-emerald-500" : "bg-neutral-400"
                                  }`}
                                />
                                {mat.isActive ? "Active" : "Inactive"}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveMaterial(index, "up")}
                                  className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#888888] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === filteredMaterials.length - 1}
                                  onClick={() => handleMoveMaterial(index, "down")}
                                  className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#888888] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(mat)}
                                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#666666] hover:text-[#111111] hover:bg-[#F0F0F0] rounded transition-colors"
                                  title="Edit Material"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteModal(mat)}
                                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete Material"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: HOMEPAGE MATERIALS SECTION ─────────────────────────────── */}
        {activeTab === "section" && (
          <div className="mt-6 space-y-8">
            {isLoadingSection ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#C5A572]" />
                <span className="text-xs uppercase tracking-wider">Loading homepage section settings...</span>
              </div>
            ) : (
              <>
                {/* Heading & Publish Bar */}
                <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0]">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                        Editorial Section Configuration
                      </h2>
                      <p className="text-xs text-[#888888] mt-0.5">
                        Current published version:{" "}
                        <span className="font-semibold text-black">v{sectionConfig?.version || 1}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isPublishingSection}
                      onClick={handlePublishSection}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] disabled:opacity-50 rounded-md text-xs sm:text-sm font-medium tracking-wider uppercase transition-colors shadow-sm min-h-[42px]"
                    >
                      {isPublishingSection ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Publish Changes</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                      Section Tagline Heading
                    </label>
                    <input
                      type="text"
                      value={sectionHeading}
                      onChange={(e) => setSectionHeading(e.target.value)}
                      placeholder="e.g. Designed in India. Crafted with timeless elegance."
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-serif italic text-base sm:text-lg text-[#111111]"
                    />
                    <p className="text-[11px] text-[#888888] mt-1">
                      This heading is rendered with premium serif typography centered above the 3 visual cards.
                    </p>
                  </div>
                </div>

                {/* Cards Grid / Management Area */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                        Visual Editorial Cards ({cards.length})
                      </h3>
                      <p className="text-xs text-[#888888]">
                        High-resolution portrait cards linking directly to catalogue material collections.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddCardModal}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] rounded text-xs font-medium uppercase tracking-wider transition-colors shadow-sm min-h-[38px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Card</span>
                    </button>
                  </div>

                  {cards.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center bg-white border border-[#E5E7EB] rounded-lg text-[#888888]">
                      <p className="text-sm font-medium text-[#111111]">No cards configured</p>
                      <p className="text-xs mt-1">Click &apos;Add Card&apos; to create an editorial visual card.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cards.map((card, index) => {
                        const targetMaterial = materials.find((m) => m.id === card.materialId);

                        return (
                          <div
                            key={card.id || index}
                            className={`bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col transition-all ${
                              card.isActive ? "border-[#E5E7EB]" : "border-dashed border-[#CCCCCC] opacity-65"
                            }`}
                          >
                            {/* Card Image Preview */}
                            <div className="relative aspect-[3/4] w-full bg-[#F5F5F5] overflow-hidden">
                              {card.imageUrl ? (
                                <Image
                                  src={card.imageUrl}
                                  alt={card.imageAlt || card.title}
                                  fill
                                  sizes="(max-width: 768px) 100vw, 33vw"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-[#999999] gap-2">
                                  <Upload className="w-6 h-6 stroke-[1.5]" />
                                  <span className="text-xs">No Image Uploaded</span>
                                </div>
                              )}

                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-mono">
                                <span>Card #{index + 1}</span>
                              </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <h4 className="font-serif text-base font-medium text-[#111111] line-clamp-1">
                                  {card.title || "Untitled Card"}
                                </h4>
                                <p className="text-xs text-[#666666] line-clamp-2 mt-1">
                                  {card.description || "No description provided."}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#F0F0F0] space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[#888888] font-mono uppercase text-[10px]">CTA:</span>
                                  <span className="font-semibold tracking-wider text-[#111111] underline underline-offset-2">
                                    {card.ctaText}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[#888888] font-mono uppercase text-[10px]">Destination:</span>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                      targetMaterial
                                        ? "bg-amber-50 text-amber-900 border border-amber-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                    }`}
                                  >
                                    <Gem className="w-3 h-3 text-[#C5A572]" />
                                    {targetMaterial ? targetMaterial.name : "Unassigned"}
                                  </span>
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0]">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => handleMoveCard(index, "up")}
                                    className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#888888] hover:text-black disabled:opacity-25 transition-colors"
                                    title="Move Left/Up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === cards.length - 1}
                                    onClick={() => handleMoveCard(index, "down")}
                                    className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#888888] hover:text-black disabled:opacity-25 transition-colors"
                                    title="Move Right/Down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCardModal(card, index)}
                                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#666666] hover:text-[#111111] hover:bg-[#F0F0F0] rounded transition-colors"
                                    title="Edit Card"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCard(index)}
                                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                                    title="Delete Card"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 3: VERSION HISTORY ────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="mt-6 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                Independent Materials Section Version History
              </h2>
              <p className="text-xs text-[#888888] mt-1">
                Every publication creates an independent snapshot in MongoDB. Restoring a previous version
                restores the heading, visual cards, CTA labels, and material destinations together without affecting
                the navbar, hero settings, or categories.
              </p>
            </div>

            {isLoadingHistory ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#C5A572]" />
                <span className="text-xs uppercase tracking-wider">Loading version history...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-16 text-center bg-white border border-[#E5E7EB] rounded-lg text-[#888888]">
                <History className="w-8 h-8 mx-auto text-[#CCCCCC] stroke-[1.5] mb-2" />
                <p className="text-sm font-medium text-[#111111]">No historical snapshots yet</p>
                <p className="text-xs mt-1">
                  Snapshots are automatically created each time you publish updates to the Materials Section.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#C5A572]/60 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 bg-black text-[#C5A572] rounded text-xs font-mono font-medium">
                          v{item.version}
                        </span>
                        <span className="text-xs text-[#888888]">
                          {new Date(item.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {item.createdBy && (
                          <span className="text-[11px] text-[#999999]">by {item.createdBy}</span>
                        )}
                      </div>

                      <div className="font-serif italic text-base text-[#111111]">
                        &ldquo;{item.heading}&rdquo;
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#666666]">
                        <span>
                          {Array.isArray(item.cards) ? item.cards.length : 0} visual cards preserved
                        </span>
                        {item.description && (
                          <>
                            <span>•</span>
                            <span className="italic text-[#888888]">{item.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmRestoreItem(item)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#CCCCCC] hover:border-[#C5A572] hover:bg-[#C5A572] active:bg-[#B3935F] hover:text-white rounded-md text-xs font-medium tracking-wider uppercase transition-colors min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore v{item.version}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* 1. Add Material Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                <Gem className="w-4 h-4 text-[#C5A572]" />
                Add New Material
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#888888] hover:text-[#111111] p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 18k Rose Gold, Moissanite"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
                {addName.trim() && (
                  <p className="text-[11px] text-[#888888] mt-1 font-mono">
                    Generated slug: /shop?material={slugify(addName)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of this fine jewellery material..."
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addIsActive"
                  checked={addIsActive}
                  onChange={(e) => setAddIsActive(e.target.checked)}
                  className="rounded border-[#CCCCCC] text-black focus:ring-black w-4 h-4"
                />
                <label htmlFor="addIsActive" className="text-xs text-[#333333] cursor-pointer">
                  Activate material immediately in storefront navigation &amp; product filters
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-[#E5E7EB] rounded-md text-xs font-medium uppercase tracking-wider text-[#666666] hover:bg-[#F9F9F9] min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] rounded-md text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  {isSubmittingAdd ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Material</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#C5A572]" />
                Edit Material: {editingMaterial.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="text-[#888888] hover:text-[#111111] p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="text-[11px] text-[#888888] mt-1 font-mono">
                  Slug: /shop?material={slugify(editName)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-[#CCCCCC] text-black focus:ring-black w-4 h-4"
                />
                <label htmlFor="editIsActive" className="text-xs text-[#333333] cursor-pointer">
                  Active in storefront navigation &amp; product filters
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-[#E5E7EB] rounded-md text-xs font-medium uppercase tracking-wider text-[#666666] hover:bg-[#F9F9F9] min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] rounded-md text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Safe Delete Confirmation Dialog */}
      {deletingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2 bg-rose-50 rounded-full">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                Delete Material
              </h3>
            </div>

            {deleteConflictError ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 space-y-2">
                <p className="font-semibold">Deletion Blocked by Business Safety Rules:</p>
                <p>{deleteConflictError}</p>
                <p className="text-[11px] text-rose-700">
                  Products referencing this material cannot be silently cascade-deleted. Please open Products Management
                  and reassign or unassign those products first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs sm:text-sm text-[#555555]">
                <p>
                  Are you sure you want to delete material{" "}
                  <strong className="text-black font-semibold">&ldquo;{deletingMaterial.name}&rdquo;</strong>?
                </p>

                {deletingMaterial.productCount > 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                    <strong>Notice:</strong> This material is currently assigned to{" "}
                    <strong>{deletingMaterial.productCount} product(s)</strong>. Safe deletion will reject this request
                    until those products are reassigned.
                  </div>
                ) : (
                  <p className="text-xs text-[#888888]">
                    This material has 0 assigned products. Any homepage cards referencing this material will have their
                    assignment safely cleared.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-[#E5E7EB] rounded-md text-xs font-medium uppercase tracking-wider text-[#666666] hover:bg-[#F9F9F9] min-h-[40px]"
              >
                {deleteConflictError ? "Close" : "Cancel"}
              </button>

              {!deleteConflictError && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteMaterial}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Add / Edit Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                {editingCardIndex !== null ? `Edit Visual Card #${editingCardIndex + 1}` : "Add Editorial Visual Card"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="text-[#888888] hover:text-[#111111] p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              {/* Card Image Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1.5">
                  Card Image (Upload from Device) *
                </label>

                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="relative w-28 aspect-[3/4] bg-[#F5F5F5] border border-[#E5E7EB] rounded overflow-hidden shrink-0">
                    {cardImageUrl ? (
                      <Image
                        src={cardImageUrl}
                        alt={cardImageAlt || "Uploaded preview"}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#999999] text-[10px] text-center p-2">
                        <span>No image</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      ref={cardFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCardImageUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingCardImage}
                      onClick={() => cardFileInputRef.current?.click()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 border border-[#CCCCCC] hover:border-[#C5A572] hover:text-[#C5A572] rounded text-xs font-medium uppercase tracking-wider text-[#111111] transition-colors min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572]"
                    >
                      {isUploadingCardImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Image</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-[#888888]">
                      Supports JPEG, PNG, and WebP (up to 5MB). Persisted durably in MongoDB storage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Card Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Grown Diamonds, Tennis Bracelets"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Short Description *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Discover the exceptional quality & sparkle."
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              {/* CTA Label */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Call-To-Action Label
                </label>
                <input
                  type="text"
                  placeholder="EXPLORE NOW, SHOP COLLECTION, DISCOVER NOW"
                  value={cardCtaText}
                  onChange={(e) => setCardCtaText(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black uppercase font-mono"
                />
              </div>

              {/* Material Destination Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#333333] mb-1">
                  Destination Material Collection *
                </label>
                <select
                  value={cardMaterialId}
                  onChange={(e) => setCardMaterialId(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">-- Select Material from Catalogue --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.productCount} products)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#888888] mt-1">
                  Clicking the card or CTA navigates directly to this material&apos;s filtered products on the storefront.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cardIsActive"
                  checked={cardIsActive}
                  onChange={(e) => setCardIsActive(e.target.checked)}
                  className="rounded border-[#CCCCCC] text-black focus:ring-black w-4 h-4"
                />
                <label htmlFor="cardIsActive" className="text-xs text-[#333333] cursor-pointer">
                  Display this card on the public homepage
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-[#E5E7EB] rounded-md text-xs font-medium uppercase tracking-wider text-[#666666] hover:bg-[#F9F9F9] min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] rounded-md text-xs font-medium uppercase tracking-wider transition-colors shadow-sm min-h-[40px]"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Confirm Restore Modal */}
      {confirmRestoreItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#111111]">
              <span className="p-2 bg-amber-50 text-amber-700 rounded-full">
                <RotateCcw className="w-5 h-5" />
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#111111]">
                Restore Version {confirmRestoreItem.version}
              </h3>
            </div>

            <div className="text-xs sm:text-sm text-[#555555] space-y-2">
              <p>
                Are you sure you want to restore the Materials Section to{" "}
                <strong className="text-black font-semibold">Version {confirmRestoreItem.version}</strong>?
              </p>
              <div className="p-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded text-xs space-y-1">
                <div>
                  <strong>Heading:</strong> &ldquo;{confirmRestoreItem.heading}&rdquo;
                </div>
                <div>
                  <strong>Cards:</strong> {confirmRestoreItem.cards.length} cards with their original titles,
                  images, CTA text, and material assignments.
                </div>
              </div>
              <p className="text-xs text-[#888888]">
                A backup snapshot of your current section will be safely preserved before the restore is applied.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
              <button
                type="button"
                onClick={() => setConfirmRestoreItem(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-[#E5E7EB] rounded-md text-xs font-medium uppercase tracking-wider text-[#666666] hover:bg-[#F9F9F9] min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(restoringVersionId)}
                onClick={() => handleRestoreVersion(confirmRestoreItem)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-[#C5A572] active:bg-[#B3935F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A572] rounded-md text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 min-h-[40px]"
              >
                {restoringVersionId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <span>Confirm Restore</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
