import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductFilters } from "./ProductFilters";
import { createCategory } from "../test/helpers";

const defaultProps = {
  searchQuery: "",
  selectedCategory: "all",
  categories: [
    createCategory({ slug: "electronics", name: "Electronics" }),
    createCategory({ slug: "clothing", name: "Clothing" }),
  ],
  onSearchChange: vi.fn(),
  onCategoryChange: vi.fn(),
};

describe("ProductFilters", () => {
  it("renders search input with placeholder", () => {
    render(<ProductFilters {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Search by product name"),
    ).toBeInTheDocument();
  });

  it("renders search input with current value", () => {
    render(<ProductFilters {...defaultProps} searchQuery="phone" />);

    expect(screen.getByDisplayValue("phone")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(<ProductFilters {...defaultProps} onSearchChange={onSearchChange} />);

    await user.type(screen.getByPlaceholderText("Search by product name"), "test");

    expect(onSearchChange).toHaveBeenCalledTimes(4);
  });

  it("renders category select with all categories option", () => {
    render(<ProductFilters {...defaultProps} />);

    expect(screen.getByText("All categories")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });

  it("calls onCategoryChange when selecting a category", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();

    render(
      <ProductFilters {...defaultProps} onCategoryChange={onCategoryChange} />,
    );

    await user.selectOptions(screen.getByDisplayValue("All categories"), "electronics");

    expect(onCategoryChange).toHaveBeenCalledWith("electronics");
  });

  it("shows selected category", () => {
    render(<ProductFilters {...defaultProps} selectedCategory="clothing" />);

    const select = screen.getByDisplayValue("Clothing");
    expect(select).toBeInTheDocument();
  });

  it("renders labels for accessibility", () => {
    render(<ProductFilters {...defaultProps} />);

    expect(screen.getByText("Search products")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
  });
});
