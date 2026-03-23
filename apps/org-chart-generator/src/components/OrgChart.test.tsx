import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrgChart from "./OrgChart";
import type { OrgNode } from "../types/org";

vi.mock("../utils/download", () => ({
  downloadAsPng: vi.fn().mockResolvedValue(undefined),
  downloadAsSvg: vi.fn().mockResolvedValue(undefined),
}));

const sampleData: OrgNode = {
  name: "Alice Johnson",
  title: "CEO",
  children: [
    {
      name: "Bob Smith",
      title: "CTO",
      children: [{ name: "Dave Wilson", title: "Engineer" }],
    },
    { name: "Carol Brown", title: "CFO" },
  ],
};

const singleNode: OrgNode = { name: "Solo Person", title: "Founder" };

describe("OrgChart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock("../utils/download", () => ({
      downloadAsPng: vi.fn().mockResolvedValue(undefined),
      downloadAsSvg: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it("renders all nodes from the data tree", () => {
    render(<OrgChart data={sampleData} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Carol Brown")).toBeInTheDocument();
    expect(screen.getByText("Dave Wilson")).toBeInTheDocument();
  });

  it("renders download PNG and SVG buttons", () => {
    render(<OrgChart data={sampleData} />);
    expect(screen.getByText("Download PNG")).toBeInTheDocument();
    expect(screen.getByText("Download SVG")).toBeInTheDocument();
  });

  it("triggers PNG download when button clicked", async () => {
    const user = userEvent.setup();
    const { downloadAsPng } = await import("../utils/download");
    render(<OrgChart data={sampleData} />);

    await user.click(screen.getByText("Download PNG"));
    expect(downloadAsPng).toHaveBeenCalled();
  });

  it("triggers SVG download when button clicked", async () => {
    const user = userEvent.setup();
    const { downloadAsSvg } = await import("../utils/download");
    render(<OrgChart data={sampleData} />);

    await user.click(screen.getByText("Download SVG"));
    expect(downloadAsSvg).toHaveBeenCalled();
  });

  it("renders SVG connector lines between nodes", () => {
    const { container } = render(<OrgChart data={sampleData} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("opens the edit dialog when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Edit team member"));
    expect(screen.getByText("Edit team member")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Solo Person")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Founder")).toBeInTheDocument();
  });

  it("updates a node through the edit dialog", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Edit team member"));

    const nameInput = screen.getByDisplayValue("Solo Person");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");

    const titleInput = screen.getByDisplayValue("Founder");
    await user.clear(titleInput);
    await user.type(titleInput, "New Title");

    await user.click(screen.getByText("Save"));

    expect(screen.getByText("New Name")).toBeInTheDocument();
    expect(screen.getByText("New Title")).toBeInTheDocument();
  });

  it("closes the edit dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Edit team member"));
    expect(screen.getByText("Edit team member")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Edit team member")).not.toBeInTheDocument();
  });

  it("opens the add child dialog", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Add team member under this node"));
    expect(screen.getByText("Add team member")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jane Doe")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Engineering Manager"),
    ).toBeInTheDocument();
  });

  it("adds a new child node through the dialog", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Add team member under this node"));

    await user.type(screen.getByPlaceholderText("Jane Doe"), "New Child");
    await user.type(
      screen.getByPlaceholderText("Engineering Manager"),
      "New Role",
    );

    await user.click(screen.getByText("Save"));

    expect(screen.getByText("New Child")).toBeInTheDocument();
    expect(screen.getByText("New Role")).toBeInTheDocument();
  });

  it("deletes a node when confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OrgChart data={sampleData} />);
    expect(screen.getByText("Carol Brown")).toBeInTheDocument();

    const carolNode = screen.getByText("Carol Brown").closest(".group")!;
    const deleteBtn = within(carolNode).getByTitle("Delete team member");
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(screen.queryByText("Carol Brown")).not.toBeInTheDocument();
  });

  it("does not delete when confirm is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<OrgChart data={sampleData} />);
    const carolNode = screen.getByText("Carol Brown").closest(".group")!;
    const deleteBtn = within(carolNode).getByTitle("Delete team member");
    await user.click(deleteBtn);

    expect(screen.getByText("Carol Brown")).toBeInTheDocument();
  });

  it("does not submit dialog when name or title is empty", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Add team member under this node"));

    const saveBtn = screen.getByText("Save");
    expect(saveBtn).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Jane Doe"), "Name Only");
    expect(saveBtn).toBeDisabled();
  });

  it("shows empty chart message when root is deleted", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OrgChart data={singleNode} />);
    await user.click(screen.getByTitle("Delete team member"));

    expect(
      screen.getByText("Chart is empty. Add a root team member to continue."),
    ).toBeInTheDocument();
    expect(screen.getByText("Add root member")).toBeInTheDocument();
  });

  it("allows adding a root member after deletion", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<OrgChart data={singleNode} />);
    await user.click(screen.getByTitle("Delete team member"));

    await user.click(screen.getByText("Add root member"));
    expect(screen.getByText("Add root team member")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Jane Doe"), "New Root");
    await user.type(
      screen.getByPlaceholderText("Engineering Manager"),
      "CEO",
    );
    await user.click(screen.getByText("Save"));

    expect(screen.getByText("New Root")).toBeInTheDocument();
  });

  it("closes dialog when clicking the backdrop", async () => {
    const user = userEvent.setup();
    render(<OrgChart data={singleNode} />);

    await user.click(screen.getByTitle("Edit team member"));
    expect(screen.getByText("Edit team member")).toBeInTheDocument();

    const backdrop = document.querySelector(".bg-slate-900\\/50")!;
    await user.click(backdrop);
    expect(screen.queryByText("Edit team member")).not.toBeInTheDocument();
  });

  it("handles download error gracefully", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { downloadAsPng } = await import("../utils/download");
    vi.mocked(downloadAsPng).mockRejectedValueOnce(new Error("fail"));

    render(<OrgChart data={sampleData} />);
    await user.click(screen.getByText("Download PNG"));

    expect(consoleSpy).toHaveBeenCalledWith("Download failed:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
