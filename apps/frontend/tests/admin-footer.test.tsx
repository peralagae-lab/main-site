import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminFooterPage from "@/app/admin/footer/page";
import * as adminAuthService from "@/services/admin-auth-service";
import * as storeDetailsService from "@/services/store-details-service";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { StoreDetailsData } from "@/types/store-details";

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/admin/footer",
}));

const mockData: StoreDetailsData = {
  id: "current",
  phone: "123 45678 90",
  address: "502 New Design Str, Melbourne, Australia",
  email: "contact@peralagae.com",
  updatedAt: new Date().toISOString(),
  updatedBy: "admin",
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Admin Footer Management Page (/admin/footer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminAuthService, "getAdminSession").mockResolvedValue({
      email: "admin@peralagae.com",
      role: "admin",
    });
    vi.spyOn(storeDetailsService, "fetchAdminStoreDetails").mockResolvedValue(mockData);
    vi.spyOn(storeDetailsService, "updateAdminStoreDetails").mockResolvedValue({
      ...mockData,
      phone: "+91 98765 43210",
      address: "100 Gold Market, Jaipur, India",
      email: "hello@peralagae.com",
    });
  });

  it("redirects unauthenticated users to /admin/login", async () => {
    vi.spyOn(adminAuthService, "getAdminSession").mockRejectedValue(new Error("Unauthorized"));

    renderWithClient(<AdminFooterPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/login");
    });
  });

  it("loads and displays EXACTLY three editable fields: Phone Number, Address, Email Address", async () => {
    renderWithClient(<AdminFooterPage />);

    await waitFor(() => {
      expect(screen.getByText("Store Contact Information")).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;
    const addressInput = screen.getByLabelText(/^address/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;

    expect(phoneInput).toBeInTheDocument();
    expect(addressInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();

    expect(phoneInput.value).toBe(mockData.phone);
    expect(addressInput.value).toBe(mockData.address);
    expect(emailInput.value).toBe(mockData.email);

    expect(screen.queryByLabelText(/store name/i)).toBeNull();
    expect(screen.queryByLabelText(/^logo$/i)).toBeNull();
    expect(screen.queryByLabelText(/opening hours/i)).toBeNull();
    expect(screen.queryByLabelText(/map/i)).toBeNull();
    expect(screen.queryByLabelText(/social/i)).toBeNull();
  });

  it("validates invalid phone and email inputs and displays error messages", async () => {
    renderWithClient(<AdminFooterPage />);

    await waitFor(() => {
      expect(screen.getByText("Store Contact Information")).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone number/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const saveBtn = screen.getByRole("button", { name: /save changes/i });

    fireEvent.change(phoneInput, { target: { value: "123" } });
    fireEvent.change(emailInput, { target: { value: "invalid-email-format" } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Phone number must be between 7 and 30 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });

    expect(storeDetailsService.updateAdminStoreDetails).not.toHaveBeenCalled();
  });

  it("submits valid updates and displays success alert", async () => {
    renderWithClient(<AdminFooterPage />);

    await waitFor(() => {
      expect(screen.getByText("Store Contact Information")).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone number/i);
    const addressInput = screen.getByLabelText(/^address/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const saveBtn = screen.getByRole("button", { name: /save changes/i });

    fireEvent.change(phoneInput, { target: { value: "+91 98765 43210" } });
    fireEvent.change(addressInput, { target: { value: "100 Gold Market, Jaipur, India" } });
    fireEvent.change(emailInput, { target: { value: "hello@peralagae.com" } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(storeDetailsService.updateAdminStoreDetails).toHaveBeenCalledWith({
        phone: "+91 98765 43210",
        address: "100 Gold Market, Jaipur, India",
        email: "hello@peralagae.com",
      });
    });

    expect(screen.getByText(/Store details updated successfully/i)).toBeInTheDocument();
  });

  it("dispatches NAVBAR_SETTINGS_UPDATED_EVENT when phone is saved so top nav bar updates immediately", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    renderWithClient(<AdminFooterPage />);

    await waitFor(() => {
      expect(screen.getByText("Store Contact Information")).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone number/i);
    const saveBtn = screen.getByRole("button", { name: /save changes/i });

    fireEvent.change(phoneInput, { target: { value: "+91 99887 76655" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "peralagae:navbar-settings-updated" })
      );
    });
  });

  it("discards uncommitted edits when Cancel is clicked", async () => {
    renderWithClient(<AdminFooterPage />);

    await waitFor(() => {
      expect(screen.getByText("Store Contact Information")).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    fireEvent.change(phoneInput, { target: { value: "+1 999 999 9999" } });
    expect(phoneInput.value).toBe("+1 999 999 9999");

    fireEvent.click(cancelBtn);

    expect(phoneInput.value).toBe(mockData.phone);
    expect(screen.getByText(/Changes discarded. Restored current database values./i)).toBeInTheDocument();
  });
});
