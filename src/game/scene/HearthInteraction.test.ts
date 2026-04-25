/**
 * HearthInteraction tests — Sub-wave A.
 */
import { describe, expect, it } from "vitest";
import {
  HEARTH_PROXIMITY_RADIUS,
  type HearthCandidate,
  pickHearthPrompt,
} from "./HearthInteraction";

const UNLIT: HearthCandidate = {
  structureId: "s1",
  groveId: "grove-3-0",
  position: { x: 56, y: 6, z: 8 },
  lit: false,
};
const LIT: HearthCandidate = {
  structureId: "s2",
  groveId: "grove-5-7",
  position: { x: 88, y: 6, z: 120 },
  lit: true,
};

describe("pickHearthPrompt", () => {
  it("returns null when no hearths exist", () => {
    expect(pickHearthPrompt({ x: 0, z: 0 }, [])).toBeNull();
  });

  it("returns null when the closest hearth is out of range", () => {
    expect(
      pickHearthPrompt({ x: 0, z: 0 }, [UNLIT], HEARTH_PROXIMITY_RADIUS),
    ).toBeNull();
  });

  it("returns 'light' variant when hearth is unlit and in range", () => {
    const pick = pickHearthPrompt({ x: 56, z: 8 }, [UNLIT]);
    expect(pick).not.toBeNull();
    expect(pick?.variant).toBe("light");
    expect(pick?.candidate.structureId).toBe("s1");
  });

  it("returns 'fast-travel' variant when hearth is lit and in range", () => {
    const pick = pickHearthPrompt({ x: 88, z: 120 }, [LIT]);
    expect(pick).not.toBeNull();
    expect(pick?.variant).toBe("fast-travel");
  });

  it("picks the nearest of multiple in-range hearths", () => {
    const near: HearthCandidate = {
      structureId: "near",
      groveId: "grove-near",
      position: { x: 1, y: 6, z: 0 },
      lit: false,
    };
    const far: HearthCandidate = {
      structureId: "far",
      groveId: "grove-far",
      position: { x: 1.9, y: 6, z: 0 },
      lit: false,
    };
    const pick = pickHearthPrompt({ x: 0, z: 0 }, [far, near], 3);
    expect(pick?.candidate.structureId).toBe("near");
  });

  it("respects an explicit radius override", () => {
    const pick = pickHearthPrompt({ x: 53, z: 8 }, [UNLIT], 4);
    expect(pick?.candidate.structureId).toBe("s1");
    const tooFar = pickHearthPrompt({ x: 53, z: 8 }, [UNLIT], 1);
    expect(tooFar).toBeNull();
  });
});
