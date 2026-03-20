import { expect, test } from "@playwright/test";
import {
  sampleQuestionnaire,
  sampleResponses,
} from "../test/fixtures";

test.describe("assessment routes", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/questionnaires/questionnaire-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          questionnaire: sampleQuestionnaire,
        }),
      });
    });

    await page.route(
      "**/api/questionnaires/questionnaire-1/responses",
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              response: sampleResponses[0],
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            responses: sampleResponses,
          }),
        });
      }
    );
  });

  test("submits an assessment response", async ({ page }) => {
    await page.goto("/questionnaire/questionnaire-1");

    await expect(page.getByText(sampleQuestionnaire.title)).toBeVisible();
    await page.getByPlaceholder("you@company.com").fill("alex@example.com");
    await page.getByRole("button", { name: "Context, blockers, and next steps" }).click();
    await page.getByRole("button", { name: "As soon as they are known" }).click();
    await page.getByRole("button", { name: "Written decisions" }).click();
    await page.getByRole("button", { name: "Triage the issue" }).click();
    await page.getByRole("button", { name: /submit assessment/i }).click();

    await expect(page.getByText(/great job!/i)).toBeVisible();
    await expect(page.getByText(/review your answers/i)).toBeVisible();
  });

  test("shows the responses dashboard", async ({ page }) => {
    await page.goto("/responses/questionnaire-1");

    await expect(page.getByText(sampleQuestionnaire.title)).toBeVisible();
    await expect(page.getByText("alex@example.com")).toBeVisible();
    await expect(page.getByText("75%")).toBeVisible();
    await expect(page.getByText("1/2")).toBeVisible();

    await page.getByRole("button", { name: /refresh/i }).click();
    await expect(page.getByText("jamie@example.com")).toBeVisible();
  });
});
