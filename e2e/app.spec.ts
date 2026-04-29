import { test, expect } from "@playwright/test";

test.describe("App Launch", () => {
  test("loads the main menu with Begin button", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    const beginBtn = page.getByRole("button", { name: /^begin$/i });
    await expect(beginBtn).toBeVisible({ timeout: 10000 });
  });

  test("shows version text", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Grovekeeper v")).toBeVisible({ timeout: 10000 });
  });

  test("does not have horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^begin$/i }).waitFor({ timeout: 10000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("shows tagline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Every forest begins with a single seed.")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("New Game Flow", () => {
  test("clicking Begin transitions away from menu", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");

    const beginBtn = page.getByRole("button", { name: /^begin$/i });
    await expect(beginBtn).toBeVisible({ timeout: 10000 });
    await beginBtn.click();

    // After clicking, Begin should no longer be visible (game loaded or modal appeared)
    await expect(beginBtn).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe("Mobile Viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("renders correctly at iPhone SE width", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    const beginBtn = page.getByRole("button", { name: /^begin$/i });
    await expect(beginBtn).toBeVisible({ timeout: 10000 });
    // Button should be fully visible (not clipped)
    const box = await beginBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });

  test("no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^begin$/i }).waitFor({ timeout: 10000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375 + 1);
  });
});
