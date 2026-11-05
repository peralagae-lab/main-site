import { API_BASE_URL, getBackendOrigin } from "@/lib/api-client";
import { getStoredAdminToken } from "./admin-auth-service";
import type { StoreDetailsData, UpdateStoreDetailsPayload } from "@/types/store-details";

export const STORE_DETAILS_QUERY_KEY = ["store-details"] as const;
export const STORE_DETAILS_UPDATED_EVENT = "peralagae:store-details-updated";

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Public Storefront Service ───────────────────────────────────────────────

/**
 * Fetches current Store Details (Phone, Address, Email) for the storefront footer.
 */
export async function fetchPublicStoreDetails(): Promise<StoreDetailsData | null> {
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin && !process.env["VITEST"]
      ? ""
      : getBackendOrigin();
  const url = `${baseUrl}/api/v1/store-details`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn("[StoreDetailsService] Failed to fetch public store details:", err);
    return null;
  }
}

// ── Admin Protected Services ────────────────────────────────────────────────

/**
 * Fetches Store Details for the admin management form.
 */
export async function fetchAdminStoreDetails(): Promise<StoreDetailsData> {
  const url = `${API_BASE_URL}/store-details/admin`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || "Failed to fetch store details.");
  }

  const json = await res.json();
  return json.data;
}

/**
 * Updates Store Details (phone, address, email) in the database singleton.
 */
export async function updateAdminStoreDetails(
  payload: UpdateStoreDetailsPayload
): Promise<StoreDetailsData> {
  const url = `${API_BASE_URL}/store-details/admin`;

  const res = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || "Failed to update store details.");
  }

  const json = await res.json();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_DETAILS_UPDATED_EVENT));
    window.dispatchEvent(new CustomEvent("peralagae:navbar-settings-updated"));
    try {
      localStorage.setItem("peralagae:navbar_updated_at", String(Date.now()));
    } catch {
      // ignore
    }
  }

  return json.data;
}
