import { test, expect } from "@playwright/test";

const uniqueEmail = () => `test-${Date.now()}@example.com`;

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("should display register page", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText("Create account")).toBeVisible();
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeVisible();
  });

  test("should navigate from login to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Create one").click();

    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText("Create account")).toBeVisible();
  });

  test("should navigate from register to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByText("Sign in").click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("should register a new user", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/register");

    await page.getByLabel("Full Name").fill("Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("should login with valid credentials", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/register");
    await page.getByLabel("Full Name").fill("Login Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(page.getByText(email)).toBeVisible();
  });

  test("should show error on invalid login", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nonexistent@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.locator(".bg-red-50")).toBeVisible({ timeout: 10_000 });
  });

  test("should logout successfully", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/register");
    await page.getByLabel("Full Name").fill("Logout Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    await page.locator("button").filter({ has: page.locator("svg") }).last().click();

    await expect(page.getByText("Sign In")).toBeVisible({ timeout: 5_000 });
  });

  test("should redirect protected routes to login", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });
});
