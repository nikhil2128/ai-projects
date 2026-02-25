import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuery, invalidateQuery, setQueryData } from "../../hooks/useQuery";

beforeEach(() => {
  invalidateQuery("");
});

describe("useQuery", () => {
  it("fetches data and returns it", async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Test" });
    const { result } = renderHook(() => useQuery("test-key", fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: 1, name: "Test" });
    expect(result.current.error).toBeNull();
  });

  it("handles fetch errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useQuery("error-key", fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe("Network error");
  });

  it("does not fetch when enabled is false", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    const { result } = renderHook(() =>
      useQuery("disabled-key", fetcher, { enabled: false })
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("calls onSuccess callback", async () => {
    const onSuccess = vi.fn();
    const fetcher = vi.fn().mockResolvedValue("success-data");
    renderHook(() =>
      useQuery("success-key", fetcher, { onSuccess })
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("success-data"));
  });

  it("calls onError callback", async () => {
    const onError = vi.fn();
    const fetcher = vi.fn().mockRejectedValue(new Error("fail"));
    renderHook(() =>
      useQuery("onerror-key", fetcher, { onError })
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0].message).toBe("fail");
  });

  it("uses cached data within stale time", async () => {
    const fetcher = vi.fn().mockResolvedValue("fresh");
    const { result } = renderHook(() =>
      useQuery("cache-key", fetcher, { staleTime: 60_000 })
    );

    await waitFor(() => expect(result.current.data).toBe("fresh"));
    expect(fetcher).toHaveBeenCalledTimes(1);

    const { result: result2 } = renderHook(() =>
      useQuery("cache-key", fetcher, { staleTime: 60_000 })
    );
    expect(result2.current.data).toBe("fresh");
    expect(result2.current.loading).toBe(false);
  });

  it("refetches data when refetch is called", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`data-${callCount}`);
    });

    const { result } = renderHook(() =>
      useQuery("refetch-key", fetcher, { staleTime: 0 })
    );

    await waitFor(() => expect(result.current.data).toBe("data-1"));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toBe("data-2");
  });
});

describe("invalidateQuery", () => {
  it("invalidates cached entries matching prefix", async () => {
    const fetcher1 = vi.fn().mockResolvedValue("v1");
    const { result } = renderHook(() =>
      useQuery("products:list", fetcher1, { staleTime: 60_000 })
    );
    await waitFor(() => expect(result.current.data).toBe("v1"));

    invalidateQuery("products:");

    const fetcher2 = vi.fn().mockResolvedValue("v2");
    const { result: result2 } = renderHook(() =>
      useQuery("products:list", fetcher2, { staleTime: 60_000 })
    );
    await waitFor(() => expect(result2.current.data).toBe("v2"));
  });
});

describe("setQueryData", () => {
  it("sets cache data manually", async () => {
    setQueryData("manual-key", { value: 42 });

    const fetcher = vi.fn().mockResolvedValue({ value: 0 });
    const { result } = renderHook(() =>
      useQuery("manual-key", fetcher, { staleTime: 60_000 })
    );

    expect(result.current.data).toEqual({ value: 42 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
