import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { FeatureFlagProvider } from "./context/FeatureFlagContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProvider>
        <App />
      </FeatureFlagProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
