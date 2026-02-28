import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Org Chart Generator E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads the home page with header and upload area", async ({ page }) => {
    await expect(page.getByText("OrgVision")).toBeVisible();
    await expect(
      page.getByText("AI-powered org chart generator"),
    ).toBeVisible();
    await expect(
      page.getByText("Turn handwritten org charts"),
    ).toBeVisible();
    await expect(page.getByText("into beautiful visuals")).toBeVisible();
    await expect(page.getByText("Drop your screenshot here")).toBeVisible();
    await expect(page.getByText("or click to browse files")).toBeVisible();
    await expect(
      page.getByText("PNG, JPG, WEBP supported"),
    ).toBeVisible();
  });

  test("shows the three-step process icons", async ({ page }) => {
    await expect(page.getByText("Upload", { exact: true })).toBeVisible();
    await expect(page.getByText("AI Parses", { exact: true })).toBeVisible();
    await expect(page.getByText("Download", { exact: true })).toBeVisible();
  });

  test("does not show New Chart button on initial load", async ({ page }) => {
    await expect(page.getByText("New Chart")).not.toBeVisible();
  });

  test("accepts file input with image types", async ({ page }) => {
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toHaveAttribute("accept", /image/);
  });

  test("shows processing state when a file is uploaded", async ({ page }) => {
    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    await page.route("**/api/parse", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Alice", title: "CEO", children: [] },
        }),
      });
    });

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(
      page.getByText("Analyzing your org chart..."),
    ).toBeVisible();
  });

  test("shows org chart after successful API response", async ({ page }) => {
    const orgData = {
      name: "Alice Johnson",
      title: "CEO",
      children: [
        { name: "Bob Smith", title: "CTO" },
        { name: "Carol Brown", title: "CFO" },
      ],
    };

    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: orgData }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText("Alice Johnson")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Bob Smith")).toBeVisible();
    await expect(page.getByText("Carol Brown")).toBeVisible();
    await expect(page.getByText("Download PNG")).toBeVisible();
    await expect(page.getByText("Download SVG")).toBeVisible();
    await expect(page.getByText("New Chart")).toBeVisible();
  });

  test("shows error state and Try Again button on API failure", async ({
    page,
  }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Could not read the handwriting",
        }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(
      page.getByText("Unable to parse the image"),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Could not read the handwriting"),
    ).toBeVisible();
    await expect(page.getByText("Try Again")).toBeVisible();
  });

  test("resets to upload view when Try Again is clicked", async ({
    page,
  }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Parse failed" }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText("Try Again")).toBeVisible({ timeout: 10000 });
    await page.getByText("Try Again").click();

    await expect(page.getByText("Drop your screenshot here")).toBeVisible();
  });

  test("can edit a node in the org chart", async ({ page }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Alice", title: "CEO" },
        }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });

    await page.getByTitle("Edit team member").click();
    await expect(page.getByText("Edit team member")).toBeVisible();

    const nameInput = page.locator("input").first();
    await nameInput.fill("Alicia Updated");
    const titleInput = page.locator("input").nth(1);
    await titleInput.fill("Founder");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Alicia Updated")).toBeVisible();
    await expect(page.getByText("Founder")).toBeVisible();
  });

  test("can add a child node", async ({ page }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Alice", title: "CEO" },
        }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });

    await page.getByTitle("Add team member under this node").click();
    await expect(page.getByText("Add team member")).toBeVisible();

    await page.getByPlaceholder("Jane Doe").fill("Bob Smith");
    await page.getByPlaceholder("Engineering Manager").fill("CTO");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Bob Smith")).toBeVisible();
    await expect(page.getByText("CTO")).toBeVisible();
  });

  test("can reset from org chart view via New Chart button", async ({
    page,
  }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Alice", title: "CEO" },
        }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText("New Chart")).toBeVisible({ timeout: 10000 });
    await page.getByText("New Chart").click();

    await expect(page.getByText("Drop your screenshot here")).toBeVisible();
  });

  test("can delete a node and shows empty chart message", async ({
    page,
  }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Alice", title: "CEO" },
        }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10000 });

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTitle("Delete team member").click();

    await expect(
      page.getByText("Chart is empty. Add a root team member to continue."),
    ).toBeVisible();
    await expect(page.getByText("Add root member")).toBeVisible();
  });

  test("handles server error (500 status)", async ({ page }) => {
    await page.route("**/api/parse", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Internal server error",
        }),
      });
    });

    const tmpDir = path.join(process.cwd(), "e2e", "fixtures");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const testImagePath = path.join(tmpDir, "test-chart.png");
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.alloc(100, 0xff));
    }

    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(testImagePath);

    await expect(
      page.getByText("Unable to parse the image"),
    ).toBeVisible({ timeout: 10000 });
  });
});
