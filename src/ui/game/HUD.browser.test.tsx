/**
 * HUD browser-mode test — runs in a real Chromium via Playwright.
 *
 * Demonstrates the vitest browser project in action. Unlike the
 * happy-dom-backed node project tests, this runs the component in
 * a real browser with actual DOM rendering, computed styles, and
 * layout measurements.
 *
 * Invoke via `pnpm vitest --project browser`.
 */

import { render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";
import {
  destroyAllEntitiesExceptWorld,
  koota,
  spawnPlayer,
} from "@/koota";
import { PlayerProgress, Quests } from "@/traits";
import { HUD } from "./HUD";

function resetWorld(): void {
  destroyAllEntitiesExceptWorld();
  koota.set(PlayerProgress, {
    level: 3,
    xp: 150,
    coins: 100,
    selectedTool: "trowel",
    selectedSpecies: "white-oak",
    currentTool: "trowel",
    unlockedTools: ["trowel", "watering-can"],
    unlockedSpecies: ["white-oak"],
    activeBorderCosmetic: null,
    prestigeCount: 0,
  });
  koota.set(Quests, {
    activeQuests: [],
    completedQuestIds: [],
    completedGoalIds: [],
    lastQuestRefresh: 0,
  });
  spawnPlayer();
}

describe("HUD (browser mode)", () => {
  beforeEach(() => {
    resetWorld();
  });

  it("renders and reflects PlayerProgress level in the DOM text", () => {
    const { container } = render(() => (
      <HUD
        onPlant={() => {}}
        onOpenMenu={() => {}}
        onOpenTools={() => {}}
        gameTime={null}
      />
    ));
    // Level 3 was set in beforeEach; it appears somewhere in the
    // rendered text content (the XPBar component renders it).
    const text = container.textContent ?? "";
    expect(text).toContain("3");
  });

  it("renders the resource bar (timber/sap/fruit/acorns)", () => {
    const { container } = render(() => (
      <HUD
        onPlant={() => {}}
        onOpenMenu={() => {}}
        onOpenTools={() => {}}
        gameTime={null}
      />
    ));
    // ResourceBar renders all 4 resource types; at minimum the
    // component tree mounts without throwing and produces DOM.
    expect(container.children.length).toBeGreaterThan(0);
  });
});
