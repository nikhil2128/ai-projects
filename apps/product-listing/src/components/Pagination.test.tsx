import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when totalPages is 0", () => {
    const { container } = render(
      <Pagination page={1} totalPages={0} onPageChange={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders prev and next buttons", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);

    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
  });

  it("disables prev button on first page", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);

    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);

    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });

  it("calls onPageChange with previous page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByLabelText("Previous page"));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByLabelText("Next page"));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("renders page numbers for small total pages", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Page ${i}`)).toBeInTheDocument();
    }
  });

  it("marks current page as active", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);

    const currentPage = screen.getByLabelText("Page 3");
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage).toBeDisabled();
  });

  it("calls onPageChange when a page number is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByLabelText("Page 4"));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("shows ellipsis for large page counts", () => {
    render(<Pagination page={5} totalPages={20} onPageChange={() => {}} />);

    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it("shows first and last page with ellipsis in the middle", () => {
    render(<Pagination page={10} totalPages={20} onPageChange={() => {}} />);

    expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 20")).toBeInTheDocument();
    expect(screen.getAllByText("...")).toHaveLength(2);
  });

  it("does not show leading ellipsis when near start", () => {
    render(<Pagination page={2} totalPages={10} onPageChange={() => {}} />);

    expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 3")).toBeInTheDocument();
  });

  it("does not show trailing ellipsis when near end", () => {
    render(<Pagination page={9} totalPages={10} onPageChange={() => {}} />);

    expect(screen.getByLabelText("Page 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Page 9")).toBeInTheDocument();
  });

  it("shows all pages when totalPages <= 7", () => {
    render(<Pagination page={4} totalPages={7} onPageChange={() => {}} />);

    for (let i = 1; i <= 7; i++) {
      expect(screen.getByLabelText(`Page ${i}`)).toBeInTheDocument();
    }

    expect(screen.queryByText("...")).not.toBeInTheDocument();
  });
});
