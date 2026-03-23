import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import Register from "./Register";

function renderRegister() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Register page automation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("validates short passwords on submit", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByPlaceholderText("John Doe"), "New User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "new@clickpulse.dev");
    await user.type(screen.getByPlaceholderText("Create a password"), "123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Password must be at least 4 characters")).toBeInTheDocument();
  });

  it("shows duplicate-email error for existing account", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByPlaceholderText("John Doe"), "New User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "alex@clickpulse.dev");
    await user.type(screen.getByPlaceholderText("Create a password"), "12345");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText("An account with this email already exists")
    ).toBeInTheDocument();
  });

  it("navigates to dashboard after successful registration", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByPlaceholderText("John Doe"), "New User");
    await user.type(screen.getByPlaceholderText("you@example.com"), "new@clickpulse.dev");
    await user.type(screen.getByPlaceholderText("Create a password"), "12345");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText("Dashboard Home")).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    const view = renderRegister();

    const passwordInput = screen.getByPlaceholderText("Create a password");
    const toggle = view.container.querySelector(
      'button[type="button"]'
    ) as HTMLButtonElement;

    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "text");
    await user.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
