import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as api from "./services/productApi";
import { createProduct, createCategory, renderWithProviders } from "./test/helpers";

vi.mock("./services/productApi");

const mockFetchProducts = vi.mocked(api.fetchProducts);
const mockFetchProductsByCategory = vi.mocked(api.fetchProductsByCategory);
const mockSearchProducts = vi.mocked(api.searchProducts);
const mockFetchCategories = vi.mocked(api.fetchCategories);

const sampleProducts = [
  createProduct({ id: 1, title: "iPhone 15", category: "smartphones", brand: "Apple", rating: 4.5 }),
  createProduct({ id: 2, title: "Galaxy S24", category: "smartphones", brand: "Samsung", rating: 4.2 }),
  createProduct({ id: 3, title: "MacBook Pro", category: "laptops", brand: "Apple", rating: 4.8 }),
];

const sampleCategories = [
  createCategory({ slug: "smartphones", name: "Smartphones" }),
  createCategory({ slug: "laptops", name: "Laptops" }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });

  mockFetchCategories.mockResolvedValue(sampleCategories);
  mockFetchProducts.mockResolvedValue({
    products: sampleProducts,
    total: 3,
    skip: 0,
    limit: 10,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("App", () => {
  it("renders header with product count", async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("3 items")).toBeInTheDocument();
    });

    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders products in grid view by default", async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("iPhone 15")).toBeInTheDocument();
    });

    expect(screen.getByText("Galaxy S24")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
  });

  it("shows loading skeletons initially", () => {
    renderWithProviders(<App />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state and allows retry", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockFetchProducts.mockRejectedValueOnce(new Error("Server down"));

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    expect(screen.getByText("Server down")).toBeInTheDocument();

    mockFetchProducts.mockResolvedValueOnce({
      products: sampleProducts,
      total: 3,
      skip: 0,
      limit: 10,
    });

    await user.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("iPhone 15")).toBeInTheDocument();
    });
  });

  it("shows empty state when no products found", async () => {
    mockFetchProducts.mockResolvedValueOnce({
      products: [],
      total: 0,
      skip: 0,
      limit: 10,
    });

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("No products found")).toBeInTheDocument();
    });
  });

  it("switches between grid and list view", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("iPhone 15")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("List view"));

    expect(screen.getByText("iPhone 15")).toBeInTheDocument();
  });

  it("renders filters with categories", async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("Smartphones")).toBeInTheDocument();
    });

    expect(screen.getByText("Laptops")).toBeInTheDocument();
    expect(screen.getByText("All categories")).toBeInTheDocument();
  });

  it("does not render pagination when totalPages <= 1", async () => {
    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByText("iPhone 15")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Pagination")).not.toBeInTheDocument();
  });

  it("renders pagination when there are multiple pages", async () => {
    mockFetchProducts.mockResolvedValueOnce({
      products: sampleProducts,
      total: 30,
      skip: 0,
      limit: 10,
    });

    renderWithProviders(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText("Pagination")).toBeInTheDocument();
    });
  });
});
