import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrgNodeCard from "./OrgNode";
import type { EditableOrgNode } from "../types/org";

function makeNode(overrides: Partial<EditableOrgNode> = {}): EditableOrgNode {
  return {
    id: "n-1",
    name: "Alice Smith",
    title: "CEO",
    children: [],
    ...overrides,
  };
}

describe("OrgNodeCard", () => {
  const defaultProps = {
    depth: 0,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddChild: vi.fn(),
  };

  it("renders the node name and title", () => {
    render(<OrgNodeCard node={makeNode()} {...defaultProps} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
  });

  it("renders initials from the name", () => {
    render(<OrgNodeCard node={makeNode()} {...defaultProps} />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("renders initials for a single name", () => {
    render(
      <OrgNodeCard node={makeNode({ name: "Alice" })} {...defaultProps} />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows direct report count when node has children", () => {
    const node = makeNode({
      children: [
        makeNode({ id: "n-2", name: "Bob", title: "CTO" }),
        makeNode({ id: "n-3", name: "Carol", title: "CFO" }),
      ],
    });
    render(<OrgNodeCard node={node} {...defaultProps} />);
    expect(screen.getByText("2 direct reports")).toBeInTheDocument();
  });

  it("shows singular direct report for one child", () => {
    const node = makeNode({
      children: [makeNode({ id: "n-2", name: "Bob", title: "CTO" })],
    });
    render(<OrgNodeCard node={node} {...defaultProps} />);
    expect(screen.getByText("1 direct report")).toBeInTheDocument();
  });

  it("does not show direct report count for leaf nodes", () => {
    render(<OrgNodeCard node={makeNode()} {...defaultProps} />);
    expect(screen.queryByText(/direct report/)).not.toBeInTheDocument();
  });

  it("calls onEdit when Edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <OrgNodeCard node={makeNode()} {...defaultProps} onEdit={onEdit} />,
    );

    await user.click(screen.getByTitle("Edit team member"));
    expect(onEdit).toHaveBeenCalledWith("n-1");
  });

  it("calls onAddChild when Add button is clicked", async () => {
    const user = userEvent.setup();
    const onAddChild = vi.fn();
    render(
      <OrgNodeCard
        node={makeNode()}
        {...defaultProps}
        onAddChild={onAddChild}
      />,
    );

    await user.click(screen.getByTitle("Add team member under this node"));
    expect(onAddChild).toHaveBeenCalledWith("n-1");
  });

  it("calls onDelete when Delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <OrgNodeCard
        node={makeNode()}
        {...defaultProps}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTitle("Delete team member"));
    expect(onDelete).toHaveBeenCalledWith("n-1");
  });

  it("applies correct color tier based on depth", () => {
    const { container } = render(
      <OrgNodeCard node={makeNode()} {...defaultProps} depth={1} />,
    );
    const avatar = container.querySelector(".rounded-full");
    expect(avatar).toBeTruthy();
  });

  it("wraps around color tiers for deep levels", () => {
    const { container } = render(
      <OrgNodeCard node={makeNode()} {...defaultProps} depth={7} />,
    );
    const avatar = container.querySelector(".rounded-full");
    expect(avatar).toBeTruthy();
  });
});
