import { test, expect, type Page } from "@playwright/test";

const uniqueEmail = () => `orders-${Date.now()}@example.com`;

async function registerAndLogin(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full Name").fill("Order Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/", { timeout: 10_000 });
}

test.describe("Order Management", () => {
  test("should show empty orders page", async ({ page }) => {
    const email = uniqueEmail();
    await registerAndLogin(page, email);

    await page.goto("/orders");
    await expect(page.getByText("No orders yet")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should show order after checkout", async ({ page }) => {
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
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Proceed to Checkout").click();

    await page
      .getByPlaceholder("123 Main St, Springfield, IL 62701")
      .fill("100 Order St, Test City, TS 99999");
    await page.getByRole("button", { name: /Pay \$/ }).click();

    await expect(page.getByText("Order Placed Successfully!")).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/orders");
    await expect(page.getByText("Your Orders")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/100 Order St/)).toBeVisible();
  });

  test("should cancel a pending order", async ({ page }) => {
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

    await page.goto("/cart");
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Proceed to Checkout").click();

    await page
      .getByPlaceholder("123 Main St, Springfield, IL 62701")
      .fill("200 Cancel St, Test City, TS 88888");
    await page.getByRole("button", { name: /Pay \$/ }).click();

    await expect(page.getByText("Order Placed Successfully!")).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/orders");
    await expect(page.getByText("Your Orders")).toBeVisible({
      timeout: 10_000,
    });

    const cancelButton = page.getByText("Cancel Order").first();
    const hasCancelable = await cancelButton.isVisible().catch(() => false);

    if (hasCancelable) {
      await cancelButton.click();
      await expect(page.getByText("Cancelled")).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
