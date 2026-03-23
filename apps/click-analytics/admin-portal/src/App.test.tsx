import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import App from "./App";

let authState = {
  isAuthenticated: false,
  user: {
    name: "Alex",
    company: "ClickPulse",
    avatar: "A",
    websites: [],
  },
  logout: vi.fn(),
};

vi.mock("./context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("./pages/Login", () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock("./pages/Register", () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock("./pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock("./pages/WebsiteDetail", () => ({
  default: () => <div>Website Detail Page</div>,
}));

describe("App routing", () => {
  beforeEach(() => {
    authState = {
      isAuthenticated: false,
      user: {
        name: "Alex",
        company: "ClickPulse",
        avatar: "A",
        websites: [],
      },
      logout: vi.fn(),
    };
  });

  it("redirects guests away from protected routes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirects authenticated users away from guest routes", () => {
    authState.isAuthenticated = true;
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });

  it("renders nested website route when authenticated", () => {
    authState.isAuthenticated = true;
    render(
      <MemoryRouter initialEntries={["/website/ws_1"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Website Detail Page")).toBeInTheDocument();
  });

  it("keeps register route accessible for guests", () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Register Page")).toBeInTheDocument();
  });

  it("redirects unknown routes to dashboard when authenticated", () => {
    authState.isAuthenticated = true;
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });
});
