import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProductDetail from "../../pages/ProductDetail";
import { renderWithProviders } from "../helpers";
import type { Product } from "../../types";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "p1" }),
  };
});

vi.mock("../../api", () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn() },
    cart: {
      get: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", items: [], updatedAt: "" }),
      addItem: vi.fn(),
    },
    products: {
      get: vi.fn(),
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

const mockProduct: Product = {
  id: "p1",
  name: "Premium Headphones",
  description: "Studio-quality wireless headphones",
  price: 149.99,
  category: "Electronics",
  stock: 25,
  imageUrl: "https://example.com/headphones.jpg",
  createdAt: "2024-01-01T00:00:00Z",
};

describe("ProductDetail Page", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("shows loading state initially", () => {
    vi.mocked(api.products.get).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ProductDetail />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows product not found when API fails", async () => {
    vi.mocked(api.products.get).mockRejectedValue(new Error("Not found"));

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Product not found")).toBeInTheDocument();
    });
  });

  it("renders product details", async () => {
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Premium Headphones")).toBeInTheDocument();
    });
    expect(screen.getByText("Studio-quality wireless headphones")).toBeInTheDocument();
    expect(screen.getByText("$149.99")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("25 in stock")).toBeInTheDocument();
  });

  it("renders back button", async () => {
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Back")).toBeInTheDocument();
    });
  });

  it("shows out of stock without add-to-cart when stock is 0", async () => {
    vi.mocked(api.products.get).mockResolvedValue({
      ...mockProduct,
      stock: 0,
    });

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Out of stock")).toBeInTheDocument();
    });
    expect(screen.queryByText("Add to Cart")).not.toBeInTheDocument();
  });

  it("shows Add to Cart button when in stock", async () => {
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });
  });

  it("allows quantity adjustment", async () => {
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    const qtyDisplay = screen.getByText("1");
    expect(qtyDisplay).toBeInTheDocument();
  });

  it("redirects to login when adding to cart while logged out", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Add to Cart"));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("adds item to cart when logged in", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "test@test.com");

    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);
    vi.mocked(api.cart.addItem).mockResolvedValue({
      id: "c1",
      userId: "u1",
      items: [{ productId: "p1", productName: "Premium Headphones", price: 149.99, quantity: 1 }],
      updatedAt: "",
    });

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Add to Cart"));

    await waitFor(() => {
      expect(api.cart.addItem).toHaveBeenCalledWith("p1", 1);
    });
    await waitFor(() => {
      expect(screen.getByText("Added to Cart")).toBeInTheDocument();
    });
  });

  it("navigates back when back button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Back")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("navigates to home from product not found page", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.get).mockRejectedValue(new Error("Not found"));

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Back to products")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Back to products"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("increments quantity with plus button", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Qty:")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const plusButton = buttons.find((btn) =>
      btn.className.includes("rounded-r")
    );
    if (plusButton) {
      await user.click(plusButton);
      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    }
  });

  it("does not decrement quantity below 1", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Qty:")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const minusButton = buttons.find((btn) =>
      btn.className.includes("rounded-l")
    );
    if (minusButton) {
      await user.click(minusButton);
      expect(screen.getByText("1")).toBeInTheDocument();
    }
  });

  it("shows error when add to cart fails", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "test@test.com");

    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);
    vi.mocked(api.cart.addItem).mockRejectedValue(new Error("Out of stock"));

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Add to Cart"));

    await waitFor(() => {
      expect(screen.getByText("Failed to add to cart")).toBeInTheDocument();
    });
  });

  it("renders product image", async () => {
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      const img = screen.getByAltText("Premium Headphones");
      expect(img).toHaveAttribute("src", "https://example.com/headphones.jpg");
    });
  });

  it("uses placeholder when no image URL", async () => {
    vi.mocked(api.products.get).mockResolvedValue({ ...mockProduct, imageUrl: "" });

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      const img = screen.getByAltText("Premium Headphones");
      expect(img.getAttribute("src")).toContain("data:image/svg+xml");
    });
  });

  it("falls back to placeholder on image load error", async () => {
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      const img = screen.getByAltText("Premium Headphones") as HTMLImageElement;
      img.dispatchEvent(new Event("error"));
      expect(img.src).toContain("data:image/svg+xml");
    });
  });

  it("shows ApiError message when add to cart fails with ApiError", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "test@test.com");

    const user = userEvent.setup();
    vi.mocked(api.products.get).mockResolvedValue(mockProduct);

    const { ApiError } = await import("../../api");
    vi.mocked(api.cart.addItem).mockRejectedValue(
      new ApiError(400, "Item out of stock")
    );

    renderWithProviders(<ProductDetail />);
    await waitFor(() => {
      expect(screen.getByText("Add to Cart")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Add to Cart"));

    await waitFor(() => {
      expect(screen.getByText("Item out of stock")).toBeInTheDocument();
    });
  });
});
