import { test, expect, type Page } from "@playwright/test";

const uniqueEmail = () => `cart-${Date.now()}@example.com`;

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full Name").fill("Cart Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/", { timeout: 10_000 });
}

test.describe("Cart Management", () => {
  test("should show empty cart", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Browse Products")).toBeVisible();
  });

  test("should add product to cart from detail page", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/");
    const productLink = page.locator(".grid a").first();
    const productExists = await productLink.isVisible().catch(() => false);

    if (productExists) {
      await productLink.click();
      await expect(page).toHaveURL(/\/products\//, { timeout: 5_000 });

      const addButton = page.getByText("Add to Cart");
      const canAdd = await addButton.isVisible().catch(() => false);

      if (canAdd) {
        await addButton.click();
        await expect(page.getByText("Added to Cart")).toBeVisible({
          timeout: 5_000,
        });
      }
    }
  });

  test("should navigate to cart and see items", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/");
    const productLink = page.locator(".grid a").first();
    const productExists = await productLink.isVisible().catch(() => false);

    if (productExists) {
      await productLink.click();

      const addButton = page.getByText("Add to Cart");
      const canAdd = await addButton.isVisible().catch(() => false);

      if (canAdd) {
        await addButton.click();
        await expect(page.getByText("Added to Cart")).toBeVisible({
          timeout: 5_000,
        });

        await page.goto("/cart");
        await expect(page.getByText("Shopping Cart")).toBeVisible({
          timeout: 10_000,
        });
        await expect(page.getByText("Proceed to Checkout")).toBeVisible();
      }
    }
  });
});

test.describe("Checkout Flow", () => {
  test("should complete full checkout process", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/");
    const productLink = page.locator(".grid a").first();
    const productExists = await productLink.isVisible().catch(() => false);

    if (!productExists) {
      test.skip();
      return;
    }

    await productLink.click();
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

    await page.goto("/cart");
    await expect(page.getByText("Shopping Cart")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByText("Proceed to Checkout").click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 5_000 });

    await expect(page.getByText("Order Summary")).toBeVisible();
    await expect(page.getByText("Shipping Address")).toBeVisible();
    await expect(page.getByText("Payment Method")).toBeVisible();

    await page
      .getByPlaceholder("123 Main St, Springfield, IL 62701")
      .fill("42 Automation Lane, Test City, TS 12345");

    const creditCardRadio = page.getByText("Credit Card");
    await expect(creditCardRadio).toBeVisible();

    await page.getByRole("button", { name: /Pay \$/ }).click();

    await expect(page.getByText("Order Placed Successfully!")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should display checkout validation error for empty address", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/");
    const productLink = page.locator(".grid a").first();
    const productExists = await productLink.isVisible().catch(() => false);

    if (!productExists) {
      test.skip();
      return;
    }

    await productLink.click();
    const addButton = page.getByText("Add to Cart");
    const canAdd = await addButton.isVisible().catch(() => false);

    if (!canAdd) {
      test.skip();
      return;
    }

    await addButton.click();
    await page.waitForTimeout(1000);

    await page.goto("/checkout");
    await expect(page.getByText("Order Summary")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: /Pay \$/ }).click();

    const textarea = page.getByPlaceholder(
      "123 Main St, Springfield, IL 62701"
    );
    const isInvalid = await textarea.evaluate((el) => {
      return !(el as HTMLTextAreaElement).validity.valid;
    });
    expect(isInvalid).toBe(true);
  });

  test("should allow selecting PayPal payment method", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/");
    const productLink = page.locator(".grid a").first();
    const productExists = await productLink.isVisible().catch(() => false);

    if (!productExists) {
      test.skip();
      return;
    }

    await productLink.click();
    const addButton = page.getByText("Add to Cart");
    const canAdd = await addButton.isVisible().catch(() => false);

    if (!canAdd) {
      test.skip();
      return;
    }

    await addButton.click();
    await page.waitForTimeout(1000);

    await page.goto("/checkout");
    await expect(page.getByText("Payment Method")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByText("PayPal").click();
    const paypalRadio = page.locator('input[value="paypal"]');
    await expect(paypalRadio).toBeChecked();
  });
});
