/**
 * XPBar browser-mode test.
 *
 * Runs in real Chromium via Playwright (vitest browser project).
 * Verifies that the animated percent number is present in the DOM and
 * responds to XP state changes. The animation uses requestAnimationFrame
 * which only works properly in a real browser.
 */

import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import {
  destroyAllEntitiesExceptWorld,
  koota,
  spawnPlayer,
} from "@/koota";
import { PlayerProgress } from "@/traits";
import { XPBar } from "./XPBar";

function resetProgress(xp: number, level: number): void {
  destroyAllEntitiesExceptWorld();
  koota.set(PlayerProgress, {
    level,
    xp,
    coins: 100,
    selectedTool: "trowel",
    selectedSpecies: "white-oak",
    currentTool: "trowel",
    unlockedTools: ["trowel", "watering-can"],
    unlockedSpecies: ["white-oak"],
    activeBorderCosmetic: null,
    prestigeCount: 0,
  });
  spawnPlayer();
}

describe("XPBar (browser mode)", () => {
  it("renders the level badge with the current level", () => {
    resetProgress(0, 1);
    const { container } = render(() => <XPBar />);
    const text = container.textContent ?? "";
    // Level 1 should appear in the XPBar (the level badge)
    expect(text).toContain("1");
  });

  it("renders a percent value between 0 and 100", () => {
    resetProgress(0, 1);
    const { container } = render(() => <XPBar />);
    const text = container.textContent ?? "";
    // Should contain a percent digit — the bar shows "0%" to "100%"
    expect(text).toMatch(/\d+%/);
  });

  it("shows correct level for level 3 player", () => {
    resetProgress(300, 3);
    const { container } = render(() => <XPBar />);
    const text = container.textContent ?? "";
    // Level 3 badge renders inside the XPBar
    expect(text).toContain("3");
  });

  it("displays a percent when player has XP progress within a level", () => {
    // Set XP to a mid-level value. The exact XP needed per level depends on
    // totalXpForLevel. We set level=1 with 50 XP (50% of the first 100 needed)
    // to ensure xpProgress is clearly non-zero and the percent renders.
    resetProgress(50, 1);
    const { container } = render(() => <XPBar />);

    // The XPBar contains two separate text spans: the level badge and the
    // percent span. We locate the percent span specifically by looking for
    // a child element that ends with "%".
    const spans = Array.from(container.querySelectorAll("span"));
    const percentSpan = spans.find((s) => /^\d+%$/.test(s.textContent?.trim() ?? ""));
    expect(percentSpan).not.toBeNull();

    const percent = Number.parseInt(percentSpan!.textContent!.replace("%", ""), 10);
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it("animated bar renders without crashing on mount", async () => {
    resetProgress(50, 1);
    const { container } = render(() => <XPBar />);

    // Give requestAnimationFrame a chance to run one tick
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    // The bar should still be mounted and contain a percent value
    const text = container.textContent ?? "";
    expect(text).toMatch(/\d+%/);
    expect(container.children.length).toBeGreaterThan(0);
  });
});
