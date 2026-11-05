import { API_BASE_URL } from "@/lib/api-client";
import { getStoredAdminToken } from "./admin-auth-service";

function getAdminHeaders(): Record<string, string> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  isActive: boolean;
  source: string;
}

export interface SubscriberListResponse {
  success: boolean;
  data: {
    subscribers: NewsletterSubscriber[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    stats: {
      total: number;
      active: number;
      inactive: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface FetchSubscribersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export async function fetchAdminSubscribers(
  params: FetchSubscribersParams = {}
): Promise<SubscriberListResponse> {
  const query = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 20),
    search: params.search || "",
    status: params.status || "ALL",
  });

  const url = `${API_BASE_URL}/newsletter/admin/subscribers?${query.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAdminHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message || `Failed to fetch subscribers (HTTP ${res.status})`
    );
  }

  return res.json();
}

export async function deleteAdminSubscriber(id: string): Promise<void> {
  const url = `${API_BASE_URL}/newsletter/admin/subscribers/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: getAdminHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message || `Failed to delete subscriber (HTTP ${res.status})`
    );
  }
}

export async function toggleAdminSubscriberStatus(
  id: string,
  isActive: boolean
): Promise<void> {
  const url = `${API_BASE_URL}/newsletter/admin/subscribers/${encodeURIComponent(id)}/status`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: getAdminHeaders(),
    credentials: "include",
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.error?.message || `Failed to update subscriber status (HTTP ${res.status})`
    );
  }
}
