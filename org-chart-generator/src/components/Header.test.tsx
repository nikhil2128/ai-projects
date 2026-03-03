import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "./Header";

const baseProps = {
  view: "home" as const,
  isSaved: false,
  onNavigateHome: vi.fn(),
  onNewChart: vi.fn(),
  onSave: vi.fn(),
  showVersionPanel: false,
  onToggleVersionPanel: vi.fn(),
  versionCount: 0,
};

describe("Header", () => {
  it("renders the app name and tagline on home view", () => {
    render(<Header {...baseProps} />);
    expect(screen.getByText("OrgVision")).toBeInTheDocument();
    expect(
      screen.getByText("AI-powered org chart generator"),
    ).toBeInTheDocument();
  });

  it("shows New Chart button on home view", () => {
    render(<Header {...baseProps} />);
    expect(screen.getByText("New Chart")).toBeInTheDocument();
  });

  it("shows back arrow when not on home", () => {
    render(<Header {...baseProps} view="upload" />);
    expect(screen.getByTitle("Back to charts")).toBeInTheDocument();
  });

  it("does not show back arrow on home view", () => {
    render(<Header {...baseProps} view="home" />);
    expect(screen.queryByTitle("Back to charts")).not.toBeInTheDocument();
  });

  it("shows chart title when editing a saved chart", () => {
    render(
      <Header
        {...baseProps}
        view="editing"
        chartTitle="Engineering Team"
        isSaved={true}
        versionCount={3}
      />,
    );
    expect(screen.getByText("Engineering Team")).toBeInTheDocument();
  });

  it("shows Save button when editing an unsaved chart", () => {
    render(<Header {...baseProps} view="editing" isSaved={false} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("shows History button when editing a saved chart", () => {
    render(
      <Header
        {...baseProps}
        view="editing"
        isSaved={true}
        versionCount={5}
      />,
    );
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onSave when Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <Header {...baseProps} view="editing" isSaved={false} onSave={onSave} />,
    );

    await user.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("calls onNavigateHome when back arrow is clicked", async () => {
    const user = userEvent.setup();
    const onNavigateHome = vi.fn();
    render(
      <Header {...baseProps} view="upload" onNavigateHome={onNavigateHome} />,
    );

    await user.click(screen.getByTitle("Back to charts"));
    expect(onNavigateHome).toHaveBeenCalledOnce();
  });

  it("renders as a sticky header element", () => {
    render(<Header {...baseProps} />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky");
  });
});
