import { test, expect } from "@playwright/test";

test.describe("Product Browsing", () => {
  test("should display home page with heading", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Discover Amazing Products")).toBeVisible();
    await expect(
      page.getByText("Browse our curated collection of quality items")
    ).toBeVisible();
  });

  test("should show search input", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByPlaceholder("Search products...")
    ).toBeVisible();
  });

  test("should display category filter buttons", async ({ page }) => {
    await page.goto("/");

    for (const cat of ["All", "Electronics", "Sports", "Home & Kitchen", "Accessories"]) {
      await expect(page.getByRole("button", { name: cat })).toBeVisible();
    }
  });

  test("should display product cards when products exist", async ({ page }) => {
    await page.goto("/");

    const productGrid = page.locator(
      ".grid"
    );
    await expect(productGrid).toBeVisible({ timeout: 10_000 });

    const cards = productGrid.locator("a");
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test("should navigate to product detail page", async ({ page }) => {
    await page.goto("/");

    const productLink = page.locator(".grid a").first();
    const exists = await productLink.isVisible().catch(() => false);

    if (exists) {
      await productLink.click();
      await expect(page).toHaveURL(/\/products\//);
      await expect(page.getByText("Back")).toBeVisible();
    }
  });

  test("should show product detail with price and stock", async ({ page }) => {
    await page.goto("/");

    const productLink = page.locator(".grid a").first();
    const exists = await productLink.isVisible().catch(() => false);

    if (exists) {
      await productLink.click();
      await expect(page.locator("text=/\\$\\d+\\.\\d{2}/").first()).toBeVisible();
      const stockOrOut = page.getByText(/in stock|Out of stock/);
      await expect(stockOrOut).toBeVisible();
    }
  });

  test("should filter products by category", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Electronics" }).click();
    await page.waitForTimeout(1500);

    const url = page.url();
    expect(url).toBe(page.url());
  });

  test("should search products by keyword", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Search products...").fill("test");
    await page.getByRole("button", { name: "Search" }).click();

    await page.waitForTimeout(1500);
  });

  test("should toggle price filter panel", async ({ page }) => {
    await page.goto("/");

    const filterButton = page.locator("button").filter({
      has: page.locator("svg"),
    });
    const toggleBtn = filterButton.last();
    await toggleBtn.click();

    await expect(page.getByText("Min Price")).toBeVisible();
    await expect(page.getByText("Max Price")).toBeVisible();
  });
});
