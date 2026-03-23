import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicManager } from "../../../src/components/TopicManager";

describe("TopicManager", () => {
  it("adds a trimmed topic and triggers generation", async () => {
    const user = userEvent.setup();
    const onTopicsChange = vi.fn();
    const onGenerate = vi.fn();

    render(
      <TopicManager
        topics={[]}
        onTopicsChange={onTopicsChange}
        onGenerate={onGenerate}
        isGenerating={false}
        imagePreview={null}
      />
    );

    await user.type(screen.getByPlaceholderText(/type a topic/i), "  Incident Review  ");
    await user.keyboard("{Enter}");

    expect(onTopicsChange).toHaveBeenCalledWith([
      { id: "test-uuid", text: "Incident Review" },
    ]);

    expect(screen.getByRole("button", { name: /generate training content/i })).toBeDisabled();
  });

  it("edits and removes existing topics", async () => {
    const user = userEvent.setup();
    const onTopicsChange = vi.fn();

    render(
      <TopicManager
        topics={[{ id: "1", text: "Planning" }]}
        onTopicsChange={onTopicsChange}
        onGenerate={vi.fn()}
        isGenerating={false}
        imagePreview="blob:preview"
      />
    );

    expect(screen.getByText(/topics extracted from uploaded image/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit planning/i }));
    const editInput = screen.getByDisplayValue("Planning");
    await user.clear(editInput);
    await user.type(editInput, "Project Planning");
    await user.click(screen.getByRole("button", { name: /save topic edit/i }));

    expect(onTopicsChange).toHaveBeenCalledWith([
      { id: "1", text: "Project Planning" },
    ]);

    await user.click(screen.getByRole("button", { name: /remove planning/i }));
    expect(onTopicsChange).toHaveBeenCalledWith([]);
  });

  it("cancels editing with Escape", async () => {
    const user = userEvent.setup();

    render(
      <TopicManager
        topics={[{ id: "1", text: "Planning" }]}
        onTopicsChange={vi.fn()}
        onGenerate={vi.fn()}
        isGenerating={false}
        imagePreview={null}
      />
    );

    await user.click(screen.getByRole("button", { name: /edit planning/i }));
    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: /edit planning/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save topic edit/i })).not.toBeInTheDocument();
  });

  it("prevents adding more than ten topics", async () => {
    const user = userEvent.setup();
    const topics = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      text: `Topic ${index + 1}`,
    }));
    const onTopicsChange = vi.fn();

    render(
      <TopicManager
        topics={topics}
        onTopicsChange={onTopicsChange}
        onGenerate={vi.fn()}
        isGenerating={true}
        imagePreview={null}
      />
    );

    expect(screen.getByPlaceholderText(/type a topic/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /generating training content/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /add topic/i }));
    expect(onTopicsChange).not.toHaveBeenCalled();
    expect(screen.getByText(/generating training content/i)).toBeInTheDocument();
  });
});
