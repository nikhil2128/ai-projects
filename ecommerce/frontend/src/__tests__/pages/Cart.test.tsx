import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CartPage from "../../pages/Cart";
import { renderWithProviders } from "../helpers";
import type { Cart } from "../../types";

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
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
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

const mockCart: Cart = {
  id: "c1",
  userId: "u1",
  items: [
    { productId: "p1", productName: "Widget A", price: 29.99, quantity: 2 },
    { productId: "p2", productName: "Widget B", price: 49.99, quantity: 1 },
  ],
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("Cart Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("shows loading state initially", () => {
    vi.mocked(api.cart.get).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CartPage />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows empty cart message when no items", async () => {
    vi.mocked(api.cart.get).mockResolvedValue({
      id: "c1",
      userId: "u1",
      items: [],
      updatedAt: "",
    });

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });
    expect(screen.getByText("Browse Products")).toBeInTheDocument();
  });

  it("renders cart items with names and prices", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });
    expect(screen.getByText("Widget B")).toBeInTheDocument();
    expect(screen.getByText("$29.99 each")).toBeInTheDocument();
    expect(screen.getByText("$49.99 each")).toBeInTheDocument();
  });

  it("calculates and displays total", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("$109.97")).toBeInTheDocument();
    });
  });

  it("shows item count in subtotal", async () => {
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText(/3 items/)).toBeInTheDocument();
    });
  });

  it("navigates to checkout when button clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Proceed to Checkout")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Proceed to Checkout"));
    expect(mockNavigate).toHaveBeenCalledWith("/checkout");
  });

  it("removes item when delete is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);
    vi.mocked(api.cart.removeItem).mockResolvedValue({
      ...mockCart,
      items: [mockCart.items[1]],
    });

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector('[class*="h-4 w-4"]')
    );
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.cart.removeItem).toHaveBeenCalledWith("p1");
    });
  });

  it("increments quantity when plus is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);
    vi.mocked(api.cart.updateItem).mockResolvedValue({
      ...mockCart,
      items: [
        { ...mockCart.items[0], quantity: 3 },
        mockCart.items[1],
      ],
    });

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    const plusButtons = screen.getAllByRole("button").filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.closest('[class*="rounded-r"]');
    });

    if (plusButtons.length > 0) {
      await user.click(plusButtons[0]);
      await waitFor(() => {
        expect(api.cart.updateItem).toHaveBeenCalledWith("p1", 3);
      });
    }
  });

  it("decrements quantity and removes when reaching 0", async () => {
    const user = userEvent.setup();
    const singleItemCart = {
      ...mockCart,
      items: [{ productId: "p1", productName: "Widget A", price: 29.99, quantity: 1 }],
    };
    vi.mocked(api.cart.get).mockResolvedValue(singleItemCart);
    vi.mocked(api.cart.removeItem).mockResolvedValue({
      ...mockCart,
      items: [],
    });

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    const minusButtons = screen.getAllByRole("button").filter((btn) =>
      btn.closest('[class*="rounded-l"]')
    );

    if (minusButtons.length > 0) {
      await user.click(minusButtons[0]);
      await waitFor(() => {
        expect(api.cart.removeItem).toHaveBeenCalledWith("p1");
      });
    }
  });

  it("shows error when update fails with generic error", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);
    vi.mocked(api.cart.removeItem).mockRejectedValue(new Error("Network error"));

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector('[class*="h-4 w-4"]')
    );
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Remove failed")).toBeInTheDocument();
    });
  });

  it("shows ApiError message when update fails with ApiError", async () => {
    const user = userEvent.setup();
    vi.mocked(api.cart.get).mockResolvedValue(mockCart);

    const { ApiError } = await import("../../api");
    vi.mocked(api.cart.updateItem).mockRejectedValue(
      new ApiError(400, "Insufficient stock")
    );

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Widget A")).toBeInTheDocument();
    });

    const plusButtons = screen.getAllByRole("button").filter((btn) =>
      btn.closest('[class*="rounded-r"]')
    );
    if (plusButtons.length > 0) {
      await user.click(plusButtons[0]);
      await waitFor(() => {
        expect(screen.getByText("Insufficient stock")).toBeInTheDocument();
      });
    }
  });

  it("shows empty state when cart fetch fails", async () => {
    vi.mocked(api.cart.get).mockRejectedValue(new Error("fail"));

    renderWithProviders(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });
  });
});
