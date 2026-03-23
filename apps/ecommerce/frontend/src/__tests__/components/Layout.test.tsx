import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import Layout from "../../components/Layout";
import { renderWithProviders } from "../helpers";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../api", () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn() },
    cart: {
      get: vi.fn().mockResolvedValue({
        id: "c1",
        userId: "u1",
        items: [{ productId: "p1", productName: "Item", price: 10, quantity: 3 }],
        updatedAt: "",
      }),
    },
  },
  ApiError: class extends Error {},
}));

describe("Layout", () => {
  it("renders header with ShopHub brand", () => {
    renderWithProviders(
      <Layout>
        <div>Page content</div>
      </Layout>
    );
    expect(screen.getByText("ShopHub")).toBeInTheDocument();
  });

  it("renders children content", () => {
    renderWithProviders(
      <Layout>
        <div>Test page content</div>
      </Layout>
    );
    expect(screen.getByText("Test page content")).toBeInTheDocument();
  });

  it("renders footer", () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByText(/Demo E-Commerce Application/)).toBeInTheDocument();
  });

  it("shows Sign In link when logged out", () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows user email when logged in", () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "user@test.com");

    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
  });

  it("shows cart and orders links when logged in", () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "user@test.com");

    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const links = screen.getAllByRole("link");
    const cartLink = links.find((link) => link.getAttribute("href") === "/cart");
    const ordersLink = links.find((link) => link.getAttribute("href") === "/orders");
    expect(cartLink).toBeDefined();
    expect(ordersLink).toBeDefined();
  });

  it("home link points to /", () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    const homeLink = screen.getByText("ShopHub").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("logs out and navigates to / when logout clicked", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "user@test.com");
    const user = userEvent.setup();

    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const logoutButton = screen.getAllByRole("button").find(
      (btn) => btn.querySelector("svg")
    );
    expect(logoutButton).toBeDefined();
    await user.click(logoutButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("does not show Sign In when logged in", () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "user@test.com");

    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });
});
