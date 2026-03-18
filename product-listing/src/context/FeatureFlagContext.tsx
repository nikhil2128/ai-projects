import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ViewMode = "grid" | "list";

interface FeatureFlagContextValue {
  viewMode: ViewMode;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("viewMode") as ViewMode) || "grid",
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "grid" ? "list" : "grid";
      localStorage.setItem("viewMode", next);
      return next;
    });
  }, []);

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    localStorage.setItem("viewMode", mode);
    setViewMode(mode);
  }, []);

  return (
    <FeatureFlagContext.Provider
      value={{ viewMode, toggleViewMode, setViewMode: handleSetViewMode }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider");
  }
  return context;
}
