import { test, expect } from "@playwright/test";

test.describe("App Launch", () => {
  test("loads the main menu with start button", async ({ page }) => {
    await page.goto("/");
    // First-time user sees "Start Growing", returning user sees "Continue Grove"
    const startBtn = page.getByRole("button", { name: /start growing|continue grove/i });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
  });

  test("shows version text", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Grove Keeper v")).toBeVisible({ timeout: 10000 });
  });

  test("does not have horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("shows tagline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Tend. Grow. Thrive.")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("New Game Flow", () => {
  test("clicking start transitions away from menu", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");

    const startBtn = page.getByRole("button", { name: /start growing/i });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // After clicking, the start button should no longer be visible
    // (either game loaded or a modal appeared)
    await expect(startBtn).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe("Mobile Viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("renders correctly at iPhone SE width", async ({ page }) => {
    await page.goto("/");
    const startBtn = page.getByRole("button", { name: /start growing|continue grove/i });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    // Button should be fully visible (not clipped)
    const box = await startBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });

  test("no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375 + 1);
  });
});
