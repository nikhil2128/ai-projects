import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StarRating } from "./StarRating";

describe("StarRating", () => {
  it("renders correct number of full stars", () => {
    const { container } = render(<StarRating rating={3.0} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(5);
  });

  it("displays the numeric rating", () => {
    render(<StarRating rating={4.2} />);
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  it("renders half star when rating has .5 or higher decimal", () => {
    const { container } = render(<StarRating rating={3.5} />);
    const gradients = container.querySelectorAll("linearGradient");
    expect(gradients).toHaveLength(1);
  });

  it("does not render half star for .4 decimal", () => {
    const { container } = render(<StarRating rating={3.4} />);
    const gradients = container.querySelectorAll("linearGradient");
    expect(gradients).toHaveLength(0);
  });

  it("renders 5 full stars for rating 5", () => {
    render(<StarRating rating={5.0} />);
    expect(screen.getByText("5.0")).toBeInTheDocument();
    expect(screen.getByLabelText("5 out of 5 stars")).toBeInTheDocument();
  });

  it("renders 0 full stars for rating 0", () => {
    render(<StarRating rating={0} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<StarRating rating={4} className="mt-2" />);
    const span = screen.getByLabelText("4 out of 5 stars");
    expect(span.className).toContain("mt-2");
  });

  it("has correct aria-label", () => {
    render(<StarRating rating={3.7} />);
    expect(screen.getByLabelText("3.7 out of 5 stars")).toBeInTheDocument();
  });
});
