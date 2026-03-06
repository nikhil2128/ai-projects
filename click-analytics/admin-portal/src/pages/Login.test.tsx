import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import Login from "./Login";

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Login page automation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows error for invalid credentials", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@example.com"), "alex@clickpulse.dev");
    await user.type(screen.getByPlaceholderText("Enter your password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("navigates to dashboard on successful login", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("you@example.com"), "alex@clickpulse.dev");
    await user.type(screen.getByPlaceholderText("Enter your password"), "demo1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Dashboard Home")).toBeInTheDocument();
  });

  it("supports quick-login demo account flow", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: /alex@clickpulse.dev/i }));
    expect(await screen.findByText("Dashboard Home")).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    const view = renderLogin();

    const passwordInput = screen.getByPlaceholderText("Enter your password");
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
