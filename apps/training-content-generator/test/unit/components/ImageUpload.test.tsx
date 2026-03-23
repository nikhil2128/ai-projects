import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageUpload } from "../../../src/components/ImageUpload";

const extractTopicsFromImageMock = vi.fn();
const dropzoneState = vi.hoisted(() => ({
  onDrop: undefined as ((files: File[]) => Promise<void>) | undefined,
  isDragActive: false,
}));

vi.mock("../../../src/api/client", () => ({
  extractTopicsFromImage: extractTopicsFromImageMock,
}));

vi.mock("react-dropzone", () => ({
  useDropzone: ({
    onDrop,
    disabled,
  }: {
    onDrop: (files: File[]) => Promise<void>;
    disabled: boolean;
  }) => {
    dropzoneState.onDrop = onDrop;
    return {
      getRootProps: () => ({ "data-disabled": disabled }),
      getInputProps: () => ({}),
      isDragActive: dropzoneState.isDragActive,
    };
  },
}));

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: null | (() => void) = null;

  readAsDataURL(file: File) {
    this.result = `data:${file.type};base64,preview`;
    this.onload?.();
  }
}

describe("ImageUpload", () => {
  beforeEach(() => {
    extractTopicsFromImageMock.mockReset();
    dropzoneState.isDragActive = false;
    vi.stubGlobal("FileReader", MockFileReader);
  });

  it("uploads an image and surfaces extracted topics", async () => {
    const onTopicsExtracted = vi.fn();
    const setIsLoading = vi.fn();
    extractTopicsFromImageMock.mockResolvedValue(["Topic A", "Topic B"]);

    render(
      <ImageUpload
        onTopicsExtracted={onTopicsExtracted}
        onError={vi.fn()}
        isLoading={false}
        setIsLoading={setIsLoading}
      />
    );

    const file = new File(["image"], "diagram.png", { type: "image/png" });
    await act(async () => {
      await dropzoneState.onDrop?.([file]);
    });

    await waitFor(() => {
      expect(onTopicsExtracted).toHaveBeenCalledWith(
        ["Topic A", "Topic B"],
        "blob:preview-url"
      );
    });
    expect(setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(screen.getByText("diagram.png")).toBeInTheDocument();
  });

  it("ignores drops without a file", async () => {
    const onTopicsExtracted = vi.fn();
    const onError = vi.fn();
    const setIsLoading = vi.fn();

    render(
      <ImageUpload
        onTopicsExtracted={onTopicsExtracted}
        onError={onError}
        isLoading={false}
        setIsLoading={setIsLoading}
      />
    );

    await act(async () => {
      await dropzoneState.onDrop?.([]);
    });

    expect(onTopicsExtracted).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(setIsLoading).not.toHaveBeenCalled();
  });

  it("clears preview state after an upload error", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    extractTopicsFromImageMock.mockRejectedValue(new Error("Analysis failed"));

    render(
      <ImageUpload
        onTopicsExtracted={vi.fn()}
        onError={onError}
        isLoading={false}
        setIsLoading={vi.fn()}
      />
    );

    const file = new File(["image"], "diagram.png", { type: "image/png" });
    await act(async () => {
      await dropzoneState.onDrop?.([file]);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Analysis failed");
    });

    expect(screen.queryByText("diagram.png")).not.toBeInTheDocument();

    extractTopicsFromImageMock.mockResolvedValue(["Recovered Topic"]);
    await act(async () => {
      await dropzoneState.onDrop?.([file]);
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /clear uploaded image/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /clear uploaded image/i }));
    expect(screen.queryByText("diagram.png")).not.toBeInTheDocument();
  });

  it("uses the default image analysis error for non-Error failures", async () => {
    const onError = vi.fn();
    extractTopicsFromImageMock.mockRejectedValue("unexpected");

    render(
      <ImageUpload
        onTopicsExtracted={vi.fn()}
        onError={onError}
        isLoading={false}
        setIsLoading={vi.fn()}
      />
    );

    await act(async () => {
      await dropzoneState.onDrop?.([
        new File(["image"], "diagram.png", { type: "image/png" }),
      ]);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Failed to analyze image");
    });
  });

  it("shows the analyzing state while loading", () => {
    render(
      <ImageUpload
        onTopicsExtracted={vi.fn()}
        onError={vi.fn()}
        isLoading={true}
        setIsLoading={vi.fn()}
      />
    );

    expect(screen.getByText(/analyzing image/i)).toBeInTheDocument();
    expect(screen.getByText(/extracting training topics with ai/i)).toBeInTheDocument();
  });

  it("shows the active drop prompt while dragging", () => {
    dropzoneState.isDragActive = true;

    render(
      <ImageUpload
        onTopicsExtracted={vi.fn()}
        onError={vi.fn()}
        isLoading={false}
        setIsLoading={vi.fn()}
      />
    );

    expect(screen.getByText(/drop your image here/i)).toBeInTheDocument();
  });
});
