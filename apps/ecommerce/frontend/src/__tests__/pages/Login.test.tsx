import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Login from "../../pages/Login";
import { renderWithProviders } from "../helpers";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../api", () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
    },
    cart: {
      get: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", items: [], updatedAt: "" }),
    },
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { api, ApiError } from "../../api";

describe("Login Page", () => {
  it("renders login form", () => {
    renderWithProviders(<Login />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("********")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    renderWithProviders(<Login />);
    expect(screen.getByText("Create one")).toHaveAttribute("href", "/register");
  });

  it("submits form with email and password", async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.login).mockResolvedValue({
      token: "t1",
      userId: "u1",
      email: "test@example.com",
    });

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("********"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith("test@example.com", "password123");
    });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("displays error on failed login", async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.login).mockRejectedValue(
      new ApiError(401, "Invalid credentials")
    );

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@test.com");
    await user.type(screen.getByPlaceholderText("********"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("displays generic error for non-ApiError", async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.login).mockRejectedValue(new Error("Network failure"));

    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@test.com");
    await user.type(screen.getByPlaceholderText("********"), "pass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByText("Login failed")).toBeInTheDocument();
    });
  });
});
