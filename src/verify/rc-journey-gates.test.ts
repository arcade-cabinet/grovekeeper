/**
 * Vitest sanity check for the RC journey gate contract.
 *
 * Runs in `pnpm test:run` so the contract is verified on every commit even
 * before Wave 18 lands and the Playwright suite can be exercised end-to-end.
 */

import { describe, expect, it } from "vitest";
import {
  RC_JOURNEY_GATES,
  RUBRIC_AXES,
  RUBRIC_MAX_SCORE,
  RUBRIC_SHIP_THRESHOLD,
  TOL_INWORLD,
  TOL_STRICT,
  TOL_UI,
} from "./rc-journey-gates";

describe("RC journey gate manifest", () => {
  it("has exactly 16 gates per the spec", () => {
    expect(RC_JOURNEY_GATES).toHaveLength(16);
  });

  it("ids match the spec verbatim", () => {
    const ids = RC_JOURNEY_GATES.map((g) => g.id);
    expect(ids).toEqual([
      "01-landing",
      "02-mainmenu",
      "03-newgame",
      "04-firstspawn-unclaimed-grove",
      "05-spirit-greets",
      "06-gather-logs",
      "07-craft-hearth",
      "08-place-hearth",
      "09-light-hearth-cinematic",
      "10-fasttravel-first-node",
      "11-villagers-arrive",
      "12-craft-first-weapon",
      "13-grove-threshold",
      "14-wilderness-first",
      "15-first-encounter",
      "16-second-grove-discovery",
    ]);
  });

  it("ids are unique", () => {
    const ids = RC_JOURNEY_GATES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every gate has a non-empty description", () => {
    for (const g of RC_JOURNEY_GATES) {
      expect(g.description).toBeTruthy();
      expect(g.description.length).toBeGreaterThan(2);
    }
  });

  it("every gate has a tolerance in (0, 1)", () => {
    for (const g of RC_JOURNEY_GATES) {
      expect(g.tolerance.maxDiffPixelRatio).toBeGreaterThan(0);
      expect(g.tolerance.maxDiffPixelRatio).toBeLessThan(1);
    }
  });

  it("landing/menu/newgame are strict", () => {
    const strictIds = ["01-landing", "02-mainmenu", "03-newgame"];
    for (const id of strictIds) {
      const g = RC_JOURNEY_GATES.find((x) => x.id === id);
      expect(g?.tolerance).toEqual(TOL_STRICT);
    }
  });

  it("uses three tolerance bands (strict, ui, in-world)", () => {
    const used = new Set(
      RC_JOURNEY_GATES.map((g) => g.tolerance.maxDiffPixelRatio),
    );
    expect(used).toEqual(
      new Set([
        TOL_STRICT.maxDiffPixelRatio,
        TOL_UI.maxDiffPixelRatio,
        TOL_INWORLD.maxDiffPixelRatio,
      ]),
    );
  });
});

describe("RC journey rubric contract", () => {
  it("has the four spec-mandated axes", () => {
    expect(RUBRIC_AXES).toEqual(["tone", "diegesis", "polish", "performance"]);
  });

  it("ship threshold is 10/12", () => {
    expect(RUBRIC_SHIP_THRESHOLD).toBe(10);
    expect(RUBRIC_MAX_SCORE).toBe(12);
    expect(RUBRIC_SHIP_THRESHOLD / RUBRIC_MAX_SCORE).toBeCloseTo(10 / 12);
  });

  it("max-per-axis * axis-count == max score", () => {
    const maxPerAxis = 3;
    expect(maxPerAxis * RUBRIC_AXES.length).toBe(RUBRIC_MAX_SCORE);
  });
});
