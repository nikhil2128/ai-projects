import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import { createProduct } from "../test/helpers";

describe("ProductCard", () => {
  it("renders product title and description", () => {
    const product = createProduct({ title: "iPhone 15", description: "Latest Apple phone" });
    render(<ProductCard product={product} />);

    expect(screen.getByText("iPhone 15")).toBeInTheDocument();
    expect(screen.getByText("Latest Apple phone")).toBeInTheDocument();
  });

  it("renders product image with alt text", () => {
    const product = createProduct({ title: "iPhone 15", thumbnail: "https://example.com/img.jpg" });
    render(<ProductCard product={product} />);

    const img = screen.getByAltText("iPhone 15");
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("renders category and brand", () => {
    const product = createProduct({ category: "smartphones", brand: "Apple" });
    render(<ProductCard product={product} />);

    expect(screen.getByText("smartphones")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("does not render brand when empty", () => {
    const product = createProduct({ brand: "" });
    render(<ProductCard product={product} />);

    expect(screen.queryByText("TestBrand")).not.toBeInTheDocument();
  });

  it("renders discounted price", () => {
    const product = createProduct({ price: 100, discountPercentage: 20 });
    render(<ProductCard product={product} />);

    expect(screen.getByText("$80.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("shows discount badge when discount > 5%", () => {
    const product = createProduct({ discountPercentage: 15 });
    render(<ProductCard product={product} />);

    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("hides discount badge when discount <= 5%", () => {
    const product = createProduct({ discountPercentage: 3 });
    render(<ProductCard product={product} />);

    expect(screen.queryByText("-3%")).not.toBeInTheDocument();
  });

  it("shows low stock badge", () => {
    const product = createProduct({ availabilityStatus: "Low Stock" });
    render(<ProductCard product={product} />);

    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  it("hides low stock badge when in stock", () => {
    const product = createProduct({ availabilityStatus: "In Stock" });
    render(<ProductCard product={product} />);

    expect(screen.queryByText("Low Stock")).not.toBeInTheDocument();
  });

  it("does not show original price line-through when discount is 0", () => {
    const product = createProduct({ price: 50, discountPercentage: 0 });
    render(<ProductCard product={product} />);

    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.queryByText("$50.00", { selector: ".line-through" })).not.toBeInTheDocument();
  });

  it("renders star rating", () => {
    const product = createProduct({ rating: 4.5 });
    render(<ProductCard product={product} />);

    expect(screen.getByText("4.5")).toBeInTheDocument();
  });
});
