import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Checkout from "../../pages/Checkout";
import { renderWithProviders } from "../helpers";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../api", () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn() },
    cart: {
      get: vi.fn(),
    },
    orders: {
      create: vi.fn(),
    },
    payments: {
      process: vi.fn(),
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

import { api, ApiError } from "../../api";

const mockCart = {
  id: "c1",
  userId: "u1",
  items: [
    { productId: "p1", productName: "Widget A", price: 29.99, quantity: 2 },
    { productId: "p2", productName: "Widget B", price: 15.0, quantity: 1 },
  ],
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Checkout Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("redirects to cart if cart is empty", async () => {
    vi.mocked(api.cart.get).mockResolvedValue({
      id: "c1",
      userId: "u1",
      items: [],
      updatedAt: "",
    });

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/cart");
    });
  });

  it("displays order summary with items", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
    });
    expect(screen.getByText(/Widget A x 2/)).toBeInTheDocument();
    expect(screen.getByText(/Widget B x 1/)).toBeInTheDocument();
  });

  it("displays total amount", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("$74.98")).toBeInTheDocument();
    });
  });

  it("renders shipping address textarea", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("Shipping Address")).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText("123 Main St, Springfield, IL 62701")
    ).toBeInTheDocument();
  });

  it("renders payment method options", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("Credit Card")).toBeInTheDocument();
    });
    expect(screen.getByText("Debit Card")).toBeInTheDocument();
    expect(screen.getByText("PayPal")).toBeInTheDocument();
  });

  it("submits order with shipping address and payment method", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);
    vi.mocked(api.orders.create).mockResolvedValue({
      id: "o1",
      userId: "u1",
      items: mockCart.items,
      totalAmount: 74.98,
      status: "pending",
      shippingAddress: "123 Test St",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(api.payments.process).mockResolvedValue({
      id: "pay1",
      orderId: "o1",
      userId: "u1",
      amount: 74.98,
      method: "credit_card",
      status: "completed",
      createdAt: "",
    });

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("123 Main St, Springfield, IL 62701"),
      "123 Test St"
    );
    await user.click(screen.getByRole("button", { name: /Pay \$74\.98/ }));

    await waitFor(() => {
      expect(api.orders.create).toHaveBeenCalledWith("123 Test St");
    });
    expect(api.payments.process).toHaveBeenCalledWith("o1", "credit_card");
  });

  it("shows success message after checkout", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);
    vi.mocked(api.orders.create).mockResolvedValue({
      id: "o1",
      userId: "u1",
      items: [],
      totalAmount: 74.98,
      status: "pending",
      shippingAddress: "123 Test St",
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(api.payments.process).mockResolvedValue({
      id: "pay1",
      orderId: "o1",
      userId: "u1",
      amount: 74.98,
      method: "credit_card",
      status: "completed",
      createdAt: "",
    });

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("123 Main St, Springfield, IL 62701"),
      "123 Test St"
    );
    await user.click(screen.getByRole("button", { name: /Pay/ }));

    await waitFor(() => {
      expect(screen.getByText("Order Placed Successfully!")).toBeInTheDocument();
    });
  });

  it("shows error when checkout fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);
    vi.mocked(api.orders.create).mockRejectedValue(
      new ApiError(400, "Insufficient stock")
    );

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("Order Summary")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("123 Main St, Springfield, IL 62701"),
      "123 Test St"
    );
    await user.click(screen.getByRole("button", { name: /Pay/ }));

    await waitFor(() => {
      expect(screen.getByText("Insufficient stock")).toBeInTheDocument();
    });
  });

  it("allows selecting different payment methods", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<Checkout />);
    await waitFor(() => {
      expect(screen.getByText("PayPal")).toBeInTheDocument();
    });

    const paypalRadio = screen.getByDisplayValue("paypal");
    await user.click(paypalRadio);
    expect(paypalRadio).toBeChecked();
  });
});
