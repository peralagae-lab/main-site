import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminOrdersPage from "@/app/admin/orders/page";
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";
import AdminGstPage from "@/app/admin/gst/page";
import CustomerOrderTrackingPage from "@/app/orders/[id]/page";
import { OrderAdminService } from "@/services/order-admin-service";
import { OrderClientService } from "@/services/order-client-service";
import { GstAdminService } from "@/services/gst-admin-service";
import { StorefrontProvider } from "@/providers/storefront-provider";
import { CustomerAuthService } from "@/services/customer-auth-service";
import { type Order } from "@/types/order";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/admin/orders",
  useParams: () => ({ id: "order-plg-001" }),
}));

describe("Admin Orders, GST Management, and Customer Tracking Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPlacedOrder: Order = {
    id: "order-plg-001",
    orderNumber: "PLG-20261021-0001",
    customerId: "cust-1",
    status: "PLACED",
    paymentMethod: "UPI",
    paymentStatus: "SIMULATED",
    subtotalInr: 97087.38,
    discountInr: 0,
    shippingInr: 0,
    taxInr: 2912.62,
    totalInr: 100000,
    gstRate: 3.0,
    gstInclusive: true,
    shippingAddress: {
      fullName: "Maharani Gayatri",
      phone: "+91 9876543210",
      addressLine1: "City Palace",
      city: "Jaipur",
      state: "Rajasthan",
      postalCode: "302002",
      country: "India",
    },
    customer: {
      id: "cust-1",
      email: "maharani@jaipur.in",
      fullName: "Maharani Gayatri",
    },
    items: [
      {
        id: "item-1",
        orderId: "order-plg-001",
        productId: "prod-1",
        productSlug: "emerald-heritage-choker",
        productName: "Emerald Heritage Choker",
        unitPriceInr: 100000,
        quantity: 1,
        totalPriceInr: 100000,
        gstRate: 3.0,
        taxInr: 2912.62,
        productImageUrl: "/test-choker.jpg",
      },
    ],
    statusLogs: [
      {
        id: "hist-1",
        orderId: "order-plg-001",
        toStatus: "PLACED",
        fromStatus: null,
        note: "Initial test placement",
        updatedBy: "cust-1",
        updatedByRole: "CUSTOMER",
        createdAt: "2026-10-21T10:00:00.000Z",
      },
    ],
    shippingUpdates: [],
    createdAt: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
  };

  const mockShippedOrder: Order = {
    ...mockPlacedOrder,
    id: "order-plg-002",
    orderNumber: "PLG-20261021-0002",
    status: "SHIPPED",
    carrierName: "Blue Dart Apex Insured",
    trackingNumber: "BD987654321IN",
    shippingDescription: "Sealed in tamper-evident security vault box with tamper seal intact.",
    statusLogs: [
      ...mockPlacedOrder.statusLogs!,
      {
        id: "hist-2",
        orderId: "order-plg-002",
        fromStatus: "PLACED",
        toStatus: "PROCESSING",
        note: "Order confirmed and being verified in vault",
        updatedBy: "admin-1",
        updatedByRole: "ADMIN",
        createdAt: "2026-10-21T11:00:00.000Z",
      },
      {
        id: "hist-3",
        orderId: "order-plg-002",
        fromStatus: "PROCESSING",
        toStatus: "SHIPPED",
        note: "Handed over to Blue Dart Express",
        updatedBy: "admin-1",
        updatedByRole: "ADMIN",
        createdAt: "2026-10-21T12:00:00.000Z",
      },
    ],
    shippingUpdates: [
      {
        id: "ship-1",
        orderId: "order-plg-002",
        carrierName: "Blue Dart Apex Insured",
        trackingNumber: "BD987654321IN",
        description: "Sealed in tamper-evident security vault box with tamper seal intact.",
        images: [
          {
            url: "/uploads/shipping/tamper-seal.jpg",
            filename: "tamper-seal.jpg",
          },
        ],
        createdBy: "javixtech@gmail.com",
        createdAt: "2026-10-21T12:00:00.000Z",
      },
    ],
  };

  describe("1. Admin Orders Table (/admin/orders)", () => {
    it("renders orders list, status badges, and handles filtering", async () => {
      const getOrdersSpy = vi.spyOn(OrderAdminService, "getOrders").mockResolvedValue({
        orders: [mockPlacedOrder, mockShippedOrder],
        pagination: {
          total: 2,
          page: 1,
          limit: 15,
          pages: 1,
        },
      });

      render(<AdminOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText("Order Management")).toBeInTheDocument();
        expect(screen.getByText("PLG-20261021-0001")).toBeInTheDocument();
        expect(screen.getByText("PLG-20261021-0002")).toBeInTheDocument();
      });

      // Verify status and payment badges
      expect(screen.getAllByText("Placed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Shipped").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("SIMULATED").length).toBeGreaterThanOrEqual(2);

      // Verify search input interaction
      const searchInput = screen.getByPlaceholderText(/search by order number/i);
      fireEvent.change(searchInput, { target: { value: "PLG-20261021-0001" } });

      await waitFor(() => {
        expect(getOrdersSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            search: "PLG-20261021-0001",
          })
        );
      });
    });
  });

  describe("2. Admin Order Detail & Shipping Evidence Modal (/admin/orders/[id])", () => {
    it("renders order snapshots, financial breakdown, and allows advancing from PLACED to PROCESSING", async () => {
      vi.spyOn(OrderAdminService, "getOrderById").mockResolvedValue(mockPlacedOrder);
      const updateStatusSpy = vi.spyOn(OrderAdminService, "updateOrderStatus").mockResolvedValue({
        ...mockPlacedOrder,
        status: "PROCESSING",
      });

      render(<AdminOrderDetailPage params={Promise.resolve({ id: "order-plg-001" })} />);

      await waitFor(() => {
        expect(screen.getByText(/PLG-20261021-0001/)).toBeInTheDocument();
        expect(screen.getAllByText("Maharani Gayatri").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/City Palace/)).toBeInTheDocument();
      });

      // Financial breakdown: GST 3% snapshot
      expect(screen.getByText(/GST \(3%\) Snapshot/i)).toBeInTheDocument();

      // Start Processing CTA is available
      const startProcessingBtn = screen.getByRole("button", { name: /start processing/i });
      expect(startProcessingBtn).toBeInTheDocument();

      fireEvent.click(startProcessingBtn);

      await waitFor(() => {
        expect(updateStatusSpy).toHaveBeenCalledWith(
          "order-plg-001",
          "PROCESSING",
          undefined
        );
      });
    });

    it("requires shipping evidence to transition from PROCESSING to SHIPPED", async () => {
      const processingOrder: Order = {
        ...mockPlacedOrder,
        status: "PROCESSING",
      };
      vi.spyOn(OrderAdminService, "getOrderById").mockResolvedValue(processingOrder);
      const addShippingSpy = vi.spyOn(OrderAdminService, "addShippingUpdate").mockResolvedValue({
        ...mockShippedOrder,
      });

      render(<AdminOrderDetailPage params={Promise.resolve({ id: "order-plg-001" })} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ship order \(add evidence\)/i })).toBeInTheDocument();
      });

      // Clicking opens shipping modal
      fireEvent.click(screen.getByRole("button", { name: /ship order \(add evidence\)/i }));

      expect(screen.getByText(/Dispatch & Shipping Evidence/i)).toBeInTheDocument();

      // Fill tracking number
      const trackingInput = screen.getByPlaceholderText(/e\.g\. BD-9988776655/i);
      fireEvent.change(trackingInput, { target: { value: "BD987654321IN" } });

      // Submit shipping evidence
      const dispatchBtn = screen.getByRole("button", { name: /dispatch order/i });
      fireEvent.click(dispatchBtn);

      await waitFor(() => {
        expect(addShippingSpy).toHaveBeenCalledWith(
          "order-plg-001",
          expect.any(FormData)
        );
      });
    });

    it("strictly hides unilateral DELIVERED button from admin (customer confirmation required)", async () => {
      vi.spyOn(OrderAdminService, "getOrderById").mockResolvedValue(mockShippedOrder);

      render(<AdminOrderDetailPage params={Promise.resolve({ id: "order-plg-002" })} />);

      await waitFor(() => {
        expect(screen.getByText(/PLG-20261021-0002/)).toBeInTheDocument();
      });

      // Confirm badge stating admin cannot unilaterally mark delivered
      expect(
        screen.getByText(/awaiting customer receipt confirmation/i)
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^mark delivered$/i })).not.toBeInTheDocument();
    });
  });

  describe("3. Customer Order Tracking & Delivery Confirmation (/orders/[id])", () => {
    it("renders lifecycle stepper, shipping evidence photos, and enables Confirm Order Received", async () => {
      vi.spyOn(CustomerAuthService, "getMe").mockResolvedValue({
        id: "cust-1",
        email: "maharani@jaipur.in",
        fullName: "Maharani Gayatri",
        role: "customer",
        isEmailVerified: true,
        isProfileComplete: true,
        profile: null,
        createdAt: new Date().toISOString(),
      });
      vi.spyOn(OrderClientService, "getOrderById").mockResolvedValue(mockShippedOrder);
      const confirmDeliverySpy = vi.spyOn(OrderClientService, "confirmDelivery").mockResolvedValue({
        ...mockShippedOrder,
        status: "DELIVERED",
        deliveredAt: new Date().toISOString(),
      });

      render(
        <StorefrontProvider>
          <CustomerOrderTrackingPage params={Promise.resolve({ id: "order-plg-002" })} />
        </StorefrontProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("PLG-20261021-0002")).toBeInTheDocument();
        expect(screen.getByText(/Blue Dart Apex Insured/i)).toBeInTheDocument();
        expect(screen.getByText(/BD987654321IN/i)).toBeInTheDocument();
      });

      // Verify "Confirm Order Received" button is displayed for SHIPPED order
      const confirmBtn = screen.getByRole("button", { name: /confirm order received/i });
      expect(confirmBtn).toBeInTheDocument();

      fireEvent.click(confirmBtn);

      // Verify confirmation modal opens
      expect(screen.getByText("Confirm Order Receipt")).toBeInTheDocument();

      // Submit physical delivery confirmation
      const modalConfirmBtn = screen.getByRole("button", { name: /yes, received/i });
      fireEvent.click(modalConfirmBtn);

      await waitFor(() => {
        expect(confirmDeliverySpy).toHaveBeenCalledWith("order-plg-002");
      });
    });
  });

  describe("4. Admin Global GST Configuration (/admin/gst)", () => {
    it("loads GST rate, updates percentage, and updates preview calculator", async () => {
      vi.spyOn(GstAdminService, "getGstSetting").mockResolvedValue({
        percentage: 3.0,
        isInclusive: true,
        updatedAt: "2026-10-21T10:00:00.000Z",
        updatedBy: "javixtech@gmail.com",
      });
      const updateGstSpy = vi.spyOn(GstAdminService, "updateGstSetting").mockResolvedValue({
        percentage: 3.5,
        isInclusive: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "javixtech@gmail.com",
      });

      render(<AdminGstPage />);

      await waitFor(() => {
        expect(screen.getByText("Global GST Settings")).toBeInTheDocument();
      });

      const gstInput = screen.getByPlaceholderText("e.g. 3.0");
      fireEvent.change(gstInput, { target: { value: "3.5" } });

      // Save changes
      const saveBtn = screen.getByRole("button", { name: /save gst settings/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateGstSpy).toHaveBeenCalledWith({
          percentage: 3.5,
          isInclusive: true,
        });
      });
    });
  });
});
