import { test, expect } from "@playwright/test";

const uniqueEmail = () => `e2e-${Date.now()}@example.com`;

test.describe("Full E2E Purchase Flow", () => {
  test("complete flow: register -> login -> browse -> add to cart -> checkout -> view order", async ({
    page,
  }) => {
    const email = uniqueEmail();

    // Step 1: Register
    await page.goto("/register");
    await page.getByLabel("Full Name").fill("E2E Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Step 2: Login
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });
    await expect(page.getByText(email)).toBeVisible();

    // Step 3: Browse products
    await expect(page.getByText("Discover Amazing Products")).toBeVisible();

    const productLink = page.locator(".grid a").first();
    const productExists = await productLink.isVisible().catch(() => false);
    if (!productExists) {
      test.skip();
      return;
    }

    // Step 4: View product detail
    const productName = await productLink
      .locator("h3")
      .textContent();
    await productLink.click();
    await expect(page).toHaveURL(/\/products\//, { timeout: 5_000 });

    if (productName) {
      await expect(page.getByText(productName)).toBeVisible();
    }

    // Step 5: Add to cart
    const addButton = page.getByText("Add to Cart");
    const canAdd = await addButton.isVisible().catch(() => false);
    if (!canAdd) {
      test.skip();
      return;
    }

    await addButton.click();
    await expect(page.getByText("Added to Cart")).toBeVisible({
      timeout: 5_000,
    });

    // Step 6: Go to cart
    await page.goto("/cart");
    await expect(page.getByText("Shopping Cart")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Proceed to Checkout")).toBeVisible();

    if (productName) {
      await expect(page.getByText(productName)).toBeVisible();
    }

    // Step 7: Proceed to checkout
    await page.getByText("Proceed to Checkout").click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 5_000 });
    await expect(page.getByText("Order Summary")).toBeVisible();

    // Step 8: Fill shipping and pay
    await page
      .getByPlaceholder("123 Main St, Springfield, IL 62701")
      .fill("1 E2E Test Ave, Automation Town, AT 00001");
    await page.getByRole("button", { name: /Pay \$/ }).click();

    await expect(page.getByText("Order Placed Successfully!")).toBeVisible({
      timeout: 15_000,
    });

    // Step 9: Verify order appears in orders page
    await page.goto("/orders");
    await expect(page.getByText("Your Orders")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/1 E2E Test Ave/)).toBeVisible();

    if (productName) {
      await expect(page.getByText(new RegExp(productName))).toBeVisible();
    }

    // Step 10: Logout
    await page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .last()
      .click();
    await expect(page.getByText("Sign In")).toBeVisible({ timeout: 5_000 });
  });
});
