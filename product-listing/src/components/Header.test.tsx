import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Header } from "./Header";
import { renderWithProviders } from "../test/helpers";

describe("Header", () => {
  it("renders the title", () => {
    renderWithProviders(<Header total={100} />);

    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders the total item count", () => {
    renderWithProviders(<Header total={42} />);

    expect(screen.getByText("42 items")).toBeInTheDocument();
  });

  it("renders with zero items", () => {
    renderWithProviders(<Header total={0} />);

    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("includes ViewToggle component", () => {
    renderWithProviders(<Header total={10} />);

    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
  });
});
