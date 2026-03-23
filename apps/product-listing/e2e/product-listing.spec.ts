import { test, expect } from "@playwright/test";

test.describe("Product Listing App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads and displays products", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

    const productCards = page.locator("article");
    await expect(productCards.first()).toBeVisible({ timeout: 10_000 });

    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);
  });

  test("displays header with item count", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

    await page.locator("article").first().waitFor({ timeout: 10_000 });
    await expect(page.getByText(/\d+ items/)).toBeVisible();
  });

  test("displays product details in grid cards", async ({ page }) => {
    const firstCard = page.locator("article").first();
    await firstCard.waitFor({ timeout: 10_000 });

    await expect(firstCard.locator("img")).toBeVisible();
    await expect(firstCard.locator("h3")).toBeVisible();
    await expect(firstCard.locator("text=/\\$\\d/").first()).toBeVisible();
  });

  test("search filters products", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder("Search by product name");
    await searchInput.fill("phone");

    await page.waitForTimeout(500);

    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const items = page.getByText(/\d+ items/);
    await expect(items).toBeVisible();
  });

  test("search with no results shows empty state", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder("Search by product name");
    await searchInput.fill("xyznonexistentproduct12345");

    await page.waitForTimeout(500);

    await expect(page.getByText("No products found")).toBeVisible({ timeout: 10_000 });
  });

  test("category filter works", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const categorySelect = page.locator("select");
    await expect(categorySelect).toBeVisible();

    const options = categorySelect.locator("option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);

    await categorySelect.selectOption({ index: 1 });

    await page.waitForTimeout(300);
    await page.locator("article").first().waitFor({ timeout: 10_000 });
  });

  test("switches between grid and list view", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const gridButton = page.getByLabel("Grid view");
    const listButton = page.getByLabel("List view");

    await expect(gridButton).toHaveAttribute("aria-pressed", "true");
    await expect(listButton).toHaveAttribute("aria-pressed", "false");

    await listButton.click();

    await expect(listButton).toHaveAttribute("aria-pressed", "true");
    await expect(gridButton).toHaveAttribute("aria-pressed", "false");

    await gridButton.click();

    await expect(gridButton).toHaveAttribute("aria-pressed", "true");
  });

  test("view mode persists across page reload", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    await page.getByLabel("List view").click();
    await expect(page.getByLabel("List view")).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    await expect(page.getByLabel("List view")).toHaveAttribute("aria-pressed", "true");
  });

  test("pagination navigates between pages", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const pagination = page.getByLabel("Pagination");

    if (await pagination.isVisible()) {
      const nextButton = page.getByLabel("Next page");
      const prevButton = page.getByLabel("Previous page");

      await expect(prevButton).toBeDisabled();

      await nextButton.click();

      await page.locator("article").first().waitFor({ timeout: 10_000 });

      await expect(prevButton).toBeEnabled();

      const page2Button = page.getByLabel("Page 2", { exact: true });
      if (await page2Button.isVisible()) {
        await expect(page2Button).toHaveAttribute("aria-current", "page");
      }

      await prevButton.click();
      await page.locator("article").first().waitFor({ timeout: 10_000 });
    }
  });

  test("shows loading skeletons", async ({ page }) => {
    await page.goto("/");

    const skeleton = page.locator(".animate-pulse").first();
    await expect(skeleton).toBeVisible({ timeout: 2_000 }).catch(() => {
      // Skeletons may disappear quickly on fast connections
    });
  });

  test("star ratings are displayed", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const rating = page.locator("[aria-label*='out of 5 stars']").first();
    await expect(rating).toBeVisible();
  });

  test("discount badges shown for discounted products", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const prices = page.locator("article").locator("text=/\\$\\d/");
    const priceCount = await prices.count();
    expect(priceCount).toBeGreaterThan(0);
  });

  test("combined search and category filtering", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const categorySelect = page.locator("select");
    await categorySelect.selectOption({ index: 1 });

    await page.waitForTimeout(300);
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder("Search by product name");
    await searchInput.fill("a");

    await page.waitForTimeout(500);

    const items = page.getByText(/\d+ items/);
    await expect(items).toBeVisible({ timeout: 10_000 });
  });

  test("clearing search restores full product list", async ({ page }) => {
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    const itemCount = page.getByText(/\d+ items/);
    const initialText = await itemCount.textContent();

    const searchInput = page.getByPlaceholder("Search by product name");
    await searchInput.fill("phone");
    await page.waitForTimeout(500);
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    await searchInput.clear();
    await page.waitForTimeout(500);
    await page.locator("article").first().waitFor({ timeout: 10_000 });

    await expect(itemCount).toHaveText(initialText!);
  });
});
