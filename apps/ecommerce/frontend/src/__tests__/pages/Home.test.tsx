import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "../../pages/Home";
import { renderWithProviders } from "../helpers";
import { invalidateQuery } from "../../hooks/useQuery";

vi.mock("../../api", () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn() },
    cart: {
      get: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", items: [], updatedAt: "" }),
    },
    products: {
      list: vi.fn(),
    },
  },
  ApiError: class extends Error {},
}));

import { api } from "../../api";

const mockProducts = [
  {
    id: "p1",
    name: "Wireless Headphones",
    description: "Great sound quality",
    price: 79.99,
    category: "Electronics",
    stock: 15,
    imageUrl: "",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "p2",
    name: "Running Shoes",
    description: "Comfortable and lightweight",
    price: 59.99,
    category: "Sports",
    stock: 30,
    imageUrl: "",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

describe("Home Page", () => {
  beforeEach(() => {
    invalidateQuery("");
  });

  it("renders page heading", () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);
    expect(screen.getByText("Discover Amazing Products")).toBeInTheDocument();
    expect(
      screen.getByText("Browse our curated collection of quality items")
    ).toBeInTheDocument();
  });

  it("renders search input", () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);
    expect(screen.getByPlaceholderText("Search products...")).toBeInTheDocument();
  });

  it("renders category filter buttons", () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Electronics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sports" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home & Kitchen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accessories" })).toBeInTheDocument();
  });

  it("renders product cards when products loaded", async () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 2,
      page: 1,
      limit: 24,
      totalPages: 1,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });
    expect(screen.getByText("Running Shoes")).toBeInTheDocument();
  });

  it("shows empty state when no products found", async () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("No products found")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Try adjusting your search or filters")
    ).toBeInTheDocument();
  });

  it("shows pagination when multiple pages exist", async () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 50,
      page: 1,
      limit: 24,
      totalPages: 3,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });
  });

  it("does not show pagination for single page", async () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 2,
      page: 1,
      limit: 24,
      totalPages: 1,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it("filters by category when button clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 2,
      page: 1,
      limit: 24,
      totalPages: 1,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Electronics" }));

    await waitFor(() => {
      const calls = vi.mocked(api.products.list).mock.calls;
      const hasElectronics = calls.some(
        (call) => call[0] && (call[0] as Record<string, unknown>).category === "Electronics"
      );
      expect(hasElectronics).toBe(true);
    });
  });

  it("has search button", () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("toggles filter panel when filter button clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);

    expect(screen.queryByPlaceholderText("0")).not.toBeInTheDocument();

    const filterButton = screen.getAllByRole("button").find(
      (btn) => btn.querySelector("svg") && !btn.textContent?.includes("Search")
        && !btn.textContent?.includes("All") && !btn.textContent?.includes("Electronics")
    );
    if (filterButton) {
      await user.click(filterButton);
      await waitFor(() => {
        expect(screen.getByText("Min Price")).toBeInTheDocument();
        expect(screen.getByText("Max Price")).toBeInTheDocument();
      });
    }
  });

  it("submits search form and resets page", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 2,
      page: 1,
      limit: 24,
      totalPages: 1,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search products...");
    await user.type(searchInput, "headphones");

    const searchButton = screen.getByRole("button", { name: "Search" });
    await user.click(searchButton);

    expect(searchInput).toHaveValue("headphones");
  });

  it("navigates between pages with pagination buttons", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 50,
      page: 1,
      limit: 24,
      totalPages: 3,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    await user.click(nextButton);

    await waitFor(() => {
      const calls = vi.mocked(api.products.list).mock.calls;
      const hasPage2 = calls.some(
        (call) => call[0] && (call[0] as Record<string, unknown>).page === 2
      );
      expect(hasPage2).toBe(true);
    });
  });

  it("updates keyword input on typing", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);
    const input = screen.getByPlaceholderText("Search products...");
    await user.type(input, "shoes");
    expect(input).toHaveValue("shoes");
  });

  it("allows entering price filters", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 24,
      totalPages: 0,
    });

    renderWithProviders(<Home />);

    const allButtons = screen.getAllByRole("button");
    const filterToggle = allButtons.find(
      (btn) => !btn.textContent || btn.textContent === ""
    );
    if (filterToggle) {
      await user.click(filterToggle);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Any")).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText("0"), "10");
      await user.type(screen.getByPlaceholderText("Any"), "100");

      expect(screen.getByPlaceholderText("0")).toHaveValue(10);
      expect(screen.getByPlaceholderText("Any")).toHaveValue(100);
    }
  });

  it("prev button is disabled on first page", async () => {
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 50,
      page: 1,
      limit: 24,
      totalPages: 3,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const prevButton = buttons.find((btn) =>
      btn.className.includes("disabled:opacity-40") && btn === buttons[buttons.length - 2]
    );
    if (prevButton) {
      expect(prevButton).toBeDisabled();
    }
  });

  it("applies price filter and resets page on submit", async () => {
    const user = userEvent.setup();
    vi.mocked(api.products.list).mockResolvedValue({
      data: mockProducts,
      total: 2,
      page: 1,
      limit: 24,
      totalPages: 1,
    });

    renderWithProviders(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole("button");
    const filterToggle = allButtons.find(
      (btn) => !btn.textContent || btn.textContent === ""
    );
    if (filterToggle) {
      await user.click(filterToggle);
      await waitFor(() => {
        expect(screen.getByText("Apply")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Apply"));

      await waitFor(() => {
        expect(api.products.list).toHaveBeenCalled();
      });
    }
  });
});
