import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProductCard from "../../components/ProductCard";
import type { Product } from "../../types";
import { renderWithRouter } from "../helpers";

const mockProduct: Product = {
  id: "p1",
  name: "Wireless Headphones",
  description: "High-quality wireless headphones with noise cancellation",
  price: 79.99,
  category: "Electronics",
  stock: 15,
  imageUrl: "https://example.com/headphones.jpg",
  createdAt: "2024-01-01T00:00:00Z",
};

describe("ProductCard", () => {
  it("renders product name and description", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    expect(
      screen.getByText(/High-quality wireless headphones/)
    ).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("$79.99")).toBeInTheDocument();
  });

  it("renders category badge", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("shows stock count when in stock", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("15 in stock")).toBeInTheDocument();
  });

  it("shows out of stock when stock is 0", () => {
    renderWithRouter(
      <ProductCard product={{ ...mockProduct, stock: 0 }} />
    );
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("links to product detail page", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/products/p1");
  });

  it("renders image with correct src and alt", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    const img = screen.getByAltText("Wireless Headphones");
    expect(img).toHaveAttribute("src", "https://example.com/headphones.jpg");
  });

  it("uses placeholder when imageUrl is empty", () => {
    renderWithRouter(
      <ProductCard product={{ ...mockProduct, imageUrl: "" }} />
    );
    const img = screen.getByAltText("Wireless Headphones");
    expect(img.getAttribute("src")).toContain("data:image/svg+xml");
  });

  it("formats price with two decimal places", () => {
    renderWithRouter(
      <ProductCard product={{ ...mockProduct, price: 10 }} />
    );
    expect(screen.getByText("$10.00")).toBeInTheDocument();
  });

  it("falls back to placeholder on image error", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    const img = screen.getByAltText("Wireless Headphones") as HTMLImageElement;
    img.dispatchEvent(new Event("error"));
    expect(img.src).toContain("data:image/svg+xml");
  });
});
