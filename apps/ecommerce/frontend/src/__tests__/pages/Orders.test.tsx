import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Orders from "../../pages/Orders";
import { renderWithProviders } from "../helpers";
import type { Order } from "../../types";

vi.mock("../../api", () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn() },
    cart: {
      get: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", items: [], updatedAt: "" }),
    },
    orders: {
      list: vi.fn(),
      cancel: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { api } from "../../api";

const mockOrders: Order[] = [
  {
    id: "order-1",
    userId: "u1",
    items: [
      { productId: "p1", productName: "Widget", price: 29.99, quantity: 2 },
    ],
    totalAmount: 59.98,
    status: "pending",
    shippingAddress: "123 Main St",
    createdAt: "2024-06-15T10:30:00Z",
    updatedAt: "2024-06-15T10:30:00Z",
  },
  {
    id: "order-2",
    userId: "u1",
    items: [
      { productId: "p2", productName: "Gadget", price: 99.99, quantity: 1 },
    ],
    totalAmount: 99.99,
    status: "delivered",
    shippingAddress: "456 Oak Ave",
    createdAt: "2024-06-10T08:00:00Z",
    updatedAt: "2024-06-14T14:00:00Z",
  },
];

describe("Orders Page", () => {
  it("shows loading state initially", () => {
    vi.mocked(api.orders.list).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<Orders />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows empty state when no orders", async () => {
    vi.mocked(api.orders.list).mockResolvedValue([]);

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
    });
    expect(screen.getByText("Browse Products")).toBeInTheDocument();
  });

  it("renders order list with item details", async () => {
    vi.mocked(api.orders.list).mockResolvedValue(mockOrders);

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText("Your Orders")).toBeInTheDocument();
    });
    expect(screen.getByText("order-1")).toBeInTheDocument();
    expect(screen.getByText("order-2")).toBeInTheDocument();
    expect(screen.getByText(/Widget x 2/)).toBeInTheDocument();
    expect(screen.getByText(/Gadget x 1/)).toBeInTheDocument();
  });

  it("renders order totals", async () => {
    vi.mocked(api.orders.list).mockResolvedValue(mockOrders);

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText("Your Orders")).toBeInTheDocument();
    });
    const totals = screen.getAllByText("$59.98");
    expect(totals.length).toBeGreaterThanOrEqual(1);
    const totals2 = screen.getAllByText("$99.99");
    expect(totals2.length).toBeGreaterThanOrEqual(1);
  });

  it("shows status badges", async () => {
    vi.mocked(api.orders.list).mockResolvedValue(mockOrders);

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("shows cancel button only for pending/confirmed orders", async () => {
    vi.mocked(api.orders.list).mockResolvedValue(mockOrders);

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByText("Cancel Order");
    expect(cancelButtons).toHaveLength(1);
  });

  it("cancels an order when cancel button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.orders.list).mockResolvedValue(mockOrders);
    vi.mocked(api.orders.cancel).mockResolvedValue({
      ...mockOrders[0],
      status: "cancelled",
    });

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText("Cancel Order")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel Order"));

    await waitFor(() => {
      expect(api.orders.cancel).toHaveBeenCalledWith("order-1");
    });
    await waitFor(() => {
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
  });

  it("shows shipping addresses", async () => {
    vi.mocked(api.orders.list).mockResolvedValue(mockOrders);

    renderWithProviders(<Orders />);
    await waitFor(() => {
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });
    expect(screen.getByText(/456 Oak Ave/)).toBeInTheDocument();
  });
});
