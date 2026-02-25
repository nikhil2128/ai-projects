import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Layout from "../../components/Layout";
import { renderWithProviders } from "../helpers";

vi.mock("../../api", () => ({
  api: {
    auth: { login: vi.fn(), register: vi.fn() },
    cart: {
      get: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", items: [], updatedAt: "" }),
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
});
