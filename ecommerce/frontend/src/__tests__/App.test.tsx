import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import App from "../App";

vi.mock("../pages/Home", () => ({
  default: () => <div data-testid="home-page">Home</div>,
}));
vi.mock("../pages/Login", () => ({
  default: () => <div data-testid="login-page">Login</div>,
}));
vi.mock("../pages/Register", () => ({
  default: () => <div data-testid="register-page">Register</div>,
}));
vi.mock("../pages/ProductDetail", () => ({
  default: () => <div data-testid="product-detail-page">ProductDetail</div>,
}));
vi.mock("../pages/Cart", () => ({
  default: () => <div data-testid="cart-page">Cart</div>,
}));
vi.mock("../pages/Checkout", () => ({
  default: () => <div data-testid="checkout-page">Checkout</div>,
}));
vi.mock("../pages/Orders", () => ({
  default: () => <div data-testid="orders-page">Orders</div>,
}));

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("App", () => {
  it("renders the home page at /", async () => {
    renderApp("/");
    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
  });

  it("renders the login page at /login", async () => {
    renderApp("/login");
    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("renders the register page at /register", async () => {
    renderApp("/register");
    expect(await screen.findByTestId("register-page")).toBeInTheDocument();
  });

  it("renders product detail page at /products/:id", async () => {
    renderApp("/products/123");
    expect(await screen.findByTestId("product-detail-page")).toBeInTheDocument();
  });

  it("redirects to login for protected /cart route when not authenticated", async () => {
    renderApp("/cart");
    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("redirects to login for protected /checkout route when not authenticated", async () => {
    renderApp("/checkout");
    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("redirects to login for protected /orders route when not authenticated", async () => {
    renderApp("/orders");
    expect(await screen.findByTestId("login-page")).toBeInTheDocument();
  });

  it("redirects unknown routes to /", async () => {
    renderApp("/unknown-page");
    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
  });

  it("renders protected /cart route when authenticated", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "a@b.com");

    renderApp("/cart");
    expect(await screen.findByTestId("cart-page")).toBeInTheDocument();
  });

  it("renders protected /orders route when authenticated", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "a@b.com");

    renderApp("/orders");
    expect(await screen.findByTestId("orders-page")).toBeInTheDocument();
  });

  it("renders protected /checkout route when authenticated", async () => {
    localStorage.setItem("token", "test-token");
    localStorage.setItem("userId", "u1");
    localStorage.setItem("email", "a@b.com");

    renderApp("/checkout");
    expect(await screen.findByTestId("checkout-page")).toBeInTheDocument();
  });
});
