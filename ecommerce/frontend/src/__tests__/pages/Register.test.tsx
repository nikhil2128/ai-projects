import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Register from "../../pages/Register";
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

describe("Register Page", () => {
  it("renders registration form", () => {
    renderWithProviders(<Register />);
    expect(screen.getByText("Create account")).toBeInTheDocument();
    expect(screen.getByText("Join ShopHub today")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min. 8 characters")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    renderWithProviders(<Register />);
    expect(screen.getByText("Sign in")).toHaveAttribute("href", "/login");
  });

  it("submits form and navigates to login", async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.register).mockResolvedValue({
      id: "u1",
      email: "new@test.com",
      name: "New User",
    });

    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText("Alice Johnson"), "New User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "new@test.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(api.auth.register).toHaveBeenCalledWith(
        "new@test.com",
        "New User",
        "password123"
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("displays error on failed registration", async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.register).mockRejectedValue(
      new ApiError(409, "Email already exists")
    );

    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText("Alice Johnson"), "Test");
    await user.type(screen.getByPlaceholderText("you@example.com"), "existing@test.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("displays generic error for non-ApiError", async () => {
    const user = userEvent.setup();
    vi.mocked(api.auth.register).mockRejectedValue(new Error("boom"));

    renderWithProviders(<Register />);

    await user.type(screen.getByPlaceholderText("Alice Johnson"), "Test");
    await user.type(screen.getByPlaceholderText("you@example.com"), "t@t.com");
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText("Registration failed")).toBeInTheDocument();
    });
  });
});
