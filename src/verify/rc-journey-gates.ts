/**
 * Single source of truth for the 16 RC journey screenshot gates.
 *
 * Imported by:
 *   - e2e/rc-journey.spec.ts (Playwright suite — captures and diffs)
 *   - src/verify/rc-journey-gates.test.ts (Vitest sanity check)
 *
 * The list, order, and tolerance per gate is the contract enforced by both
 * suites. Changing this file is a deliberate change to the verification
 * contract and should be reviewed against the spec at:
 *   docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md
 *   §"Screenshot gates"
 */

export interface GateTolerance {
  readonly maxDiffPixelRatio: number;
}

export interface RcJourneyGate {
  readonly id: string;
  readonly description: string;
  readonly tolerance: GateTolerance;
}

/** Strict tolerance — landing/menu/static surfaces. */
export const TOL_STRICT: GateTolerance = { maxDiffPixelRatio: 0.001 };
/** UI surfaces — crafting, fast-travel, etc. Mostly static with chrome. */
export const TOL_UI: GateTolerance = { maxDiffPixelRatio: 0.02 };
/** In-world / cinematic — animation, lighting, GPU jitter. */
export const TOL_INWORLD: GateTolerance = { maxDiffPixelRatio: 0.05 };

export const RC_JOURNEY_GATES: readonly RcJourneyGate[] = Object.freeze([
  { id: "01-landing", description: "Landing page", tolerance: TOL_STRICT },
  { id: "02-mainmenu", description: "Main menu", tolerance: TOL_STRICT },
  { id: "03-newgame", description: "New game modal", tolerance: TOL_STRICT },
  {
    id: "04-firstspawn-unclaimed-grove",
    description: "First spawn — unclaimed grove",
    tolerance: TOL_INWORLD,
  },
  {
    id: "05-spirit-greets",
    description: "Grove Spirit greets player",
    tolerance: TOL_INWORLD,
  },
  {
    id: "06-gather-logs",
    description: "Gather logs from felled tree",
    tolerance: TOL_INWORLD,
  },
  { id: "07-craft-hearth", description: "Craft hearth UI", tolerance: TOL_UI },
  {
    id: "08-place-hearth",
    description: "Place hearth ghost preview",
    tolerance: TOL_INWORLD,
  },
  {
    id: "09-light-hearth-cinematic",
    description: "Light-hearth cinematic frame",
    tolerance: TOL_INWORLD,
  },
  {
    id: "10-fasttravel-first-node",
    description: "Fast-travel UI with first node",
    tolerance: TOL_UI,
  },
  {
    id: "11-villagers-arrive",
    description: "Villagers arrive animation",
    tolerance: TOL_INWORLD,
  },
  {
    id: "12-craft-first-weapon",
    description: "Craft first weapon UI",
    tolerance: TOL_UI,
  },
  {
    id: "13-grove-threshold",
    description: "Crossing grove threshold (palette delta)",
    tolerance: TOL_INWORLD,
  },
  {
    id: "14-wilderness-first",
    description: "First wilderness chunk",
    tolerance: TOL_INWORLD,
  },
  {
    id: "15-first-encounter",
    description: "First hostile encounter",
    tolerance: TOL_INWORLD,
  },
  {
    id: "16-second-grove-discovery",
    description: "Second grove discovered (map node added)",
    tolerance: TOL_INWORLD,
  },
] as const);

/** The four rubric axes scored 0–3 per surface. Total of 12; ships at ≥ 10. */
export const RUBRIC_AXES = [
  "tone",
  "diegesis",
  "polish",
  "performance",
] as const;
export type RubricAxis = (typeof RUBRIC_AXES)[number];

export const RUBRIC_SHIP_THRESHOLD = 10;
export const RUBRIC_MAX_SCORE = 12;
