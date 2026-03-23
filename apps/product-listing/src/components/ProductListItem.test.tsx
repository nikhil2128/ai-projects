import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductListItem } from "./ProductListItem";
import { createProduct } from "../test/helpers";

describe("ProductListItem", () => {
  it("renders product title and description", () => {
    const product = createProduct({ title: "MacBook Pro", description: "Powerful laptop" });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(screen.getByText("Powerful laptop")).toBeInTheDocument();
  });

  it("renders product image with alt text", () => {
    const product = createProduct({ title: "MacBook Pro", thumbnail: "https://example.com/mac.jpg" });
    render(<ProductListItem product={product} />);

    const img = screen.getByAltText("MacBook Pro");
    expect(img).toHaveAttribute("src", "https://example.com/mac.jpg");
  });

  it("renders category and brand", () => {
    const product = createProduct({ category: "laptops", brand: "Apple" });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("laptops")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("does not render brand when empty", () => {
    const product = createProduct({ brand: "" });
    render(<ProductListItem product={product} />);

    expect(screen.queryByText("TestBrand")).not.toBeInTheDocument();
  });

  it("renders discounted price correctly", () => {
    const product = createProduct({ price: 200, discountPercentage: 25 });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
  });

  it("shows discount badge when discount > 5%", () => {
    const product = createProduct({ discountPercentage: 20 });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("-20%")).toBeInTheDocument();
  });

  it("hides discount badge when discount <= 5%", () => {
    const product = createProduct({ discountPercentage: 2 });
    render(<ProductListItem product={product} />);

    expect(screen.queryByText("-2%")).not.toBeInTheDocument();
  });

  it("shows low stock badge", () => {
    const product = createProduct({ availabilityStatus: "Low Stock" });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("Low Stock")).toBeInTheDocument();
  });

  it("hides low stock badge when in stock", () => {
    const product = createProduct({ availabilityStatus: "In Stock" });
    render(<ProductListItem product={product} />);

    expect(screen.queryByText("Low Stock")).not.toBeInTheDocument();
  });

  it("renders star rating", () => {
    const product = createProduct({ rating: 3.8 });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("3.8")).toBeInTheDocument();
  });

  it("does not show original price when discount is 0", () => {
    const product = createProduct({ price: 75, discountPercentage: 0 });
    render(<ProductListItem product={product} />);

    expect(screen.getByText("$75.00")).toBeInTheDocument();
    const lineThrough = screen.queryByText("$75.00", { selector: ".line-through" });
    expect(lineThrough).not.toBeInTheDocument();
  });
});
