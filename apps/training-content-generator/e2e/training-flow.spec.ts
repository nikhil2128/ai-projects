import { expect, test } from "@playwright/test";
import { sampleModules } from "../test/fixtures";

test.describe("training flow", () => {
  test("supports manual topic entry and content generation", async ({ page }) => {
    await page.route("**/api/generate-content", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          content: sampleModules,
        }),
      });
    });

    await page.goto("/");

    await page.getByRole("button", { name: /enter topics manually/i }).click();
    await page.getByPlaceholder("Type a topic and press Enter...").fill("Team Communication");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /generate training content/i }).click();

    await expect(
      page.getByRole("heading", { name: "Team Communication", level: 2 })
    ).toBeVisible();

    await page.getByRole("button", { name: /next module/i }).click();
    await expect(
      page.getByRole("heading", { name: "Incident Response", level: 2 })
    ).toBeVisible();

    await page.getByRole("button", { name: "Triage the issue" }).click();
    await page.getByRole("button", { name: /check answers/i }).click();

    await expect(page.getByText("1/1")).toBeVisible();
  });

  test("extracts topics from an uploaded image", async ({ page }) => {
    await page.route("**/api/extract-topics", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          topics: ["Risk Management", "Escalation Planning"],
        }),
      });
    });

    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.png",
      mimeType: "image/png",
      buffer: Buffer.from([137, 80, 78, 71]),
    });

    await expect(page.getByText("Risk Management")).toBeVisible();
    await expect(page.getByText("Escalation Planning")).toBeVisible();
    await expect(page.getByText(/topics extracted from uploaded image/i)).toBeVisible();
  });
});
