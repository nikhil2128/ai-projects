import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProductSkeletons } from "./ProductSkeleton";
import { renderWithProviders } from "../test/helpers";

describe("ProductSkeletons", () => {
  it("renders 10 grid skeletons by default", () => {
    const { container } = renderWithProviders(<ProductSkeletons />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(10);
  });

  it("renders custom count of skeletons", () => {
    const { container } = renderWithProviders(<ProductSkeletons count={3} />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(3);
  });

  it("renders grid layout in grid view mode", () => {
    const { container } = renderWithProviders(<ProductSkeletons count={2} />);

    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).toBeInTheDocument();
  });

  it("renders list layout in list view mode", () => {
    localStorage.setItem("viewMode", "list");

    const { container } = renderWithProviders(<ProductSkeletons count={2} />);

    const listContainer = container.querySelector(".space-y-4");
    expect(listContainer).toBeInTheDocument();
  });
});
