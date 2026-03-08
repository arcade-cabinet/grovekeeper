import type { NpcScheduleEntry } from "@/game/ecs/components/npc";
import {
  activityToAnimState,
  clearAllScheduleStates,
  clearScheduleState,
  isAtPosition,
  resolveScheduleEntry,
  tickNpcSchedule,
} from "./npcSchedule.ts";
import type { WalkabilityGrid } from "./pathfinding.ts";

// Mock npcMovement so we control startNpcPath and avoid real pathfinding
jest.mock("./npcMovement", () => ({
  startNpcPath: jest.fn(() => true),
  cancelNpcMovement: jest.fn(),
}));

import { startNpcPath } from "./npcMovement.ts";

const mockStartNpcPath = startNpcPath as jest.Mock;

function makeGrid(): WalkabilityGrid {
  const data = new Uint8Array(25); // 5×5 open grid
  return { data, width: 5, height: 5, originX: 0, originZ: 0 };
}

const BASE_SCHEDULE: NpcScheduleEntry[] = [
  { hour: 6, activity: "wake", position: { x: 1, z: 1 } },
  { hour: 8, activity: "work", position: { x: 5, z: 5 } },
  { hour: 18, activity: "eat", position: { x: 2, z: 3 } },
  { hour: 20, activity: "sleep", position: { x: 1, z: 1 } },
];

beforeEach(() => {
  clearAllScheduleStates();
  mockStartNpcPath.mockClear();
  mockStartNpcPath.mockReturnValue(true);
});

// ── resolveScheduleEntry ──────────────────────────────────────────────────────

describe("resolveScheduleEntry (Spec §19.5)", () => {
  it("returns undefined for empty schedule", () => {
    expect(resolveScheduleEntry([], 10)).toBeUndefined();
  });

  it("returns the only entry for single-entry schedule at any hour", () => {
    const schedule: NpcScheduleEntry[] = [{ hour: 8, activity: "work", position: { x: 5, z: 5 } }];
    expect(resolveScheduleEntry(schedule, 0)).toBe(schedule[0]);
    expect(resolveScheduleEntry(schedule, 12)).toBe(schedule[0]);
    expect(resolveScheduleEntry(schedule, 23)).toBe(schedule[0]);
  });

  it("returns entry when hour exactly matches", () => {
    const entry = resolveScheduleEntry(BASE_SCHEDULE, 8);
    expect(entry?.activity).toBe("work");
    expect(entry?.hour).toBe(8);
  });

  it("returns last matching entry when hour is between two entries", () => {
    const entry = resolveScheduleEntry(BASE_SCHEDULE, 12);
    expect(entry?.activity).toBe("work"); // hour 8 is the last before 12
  });

  it("wraps to last entry when hour is before first entry (overnight)", () => {
    const entry = resolveScheduleEntry(BASE_SCHEDULE, 3);
    expect(entry?.activity).toBe("sleep");
    expect(entry?.hour).toBe(20);
  });

  it("returns first entry when hour exactly matches first entry", () => {
    const entry = resolveScheduleEntry(BASE_SCHEDULE, 6);
    expect(entry?.activity).toBe("wake");
  });

  it("returns last entry when hour exactly matches last entry", () => {
    const entry = resolveScheduleEntry(BASE_SCHEDULE, 20);
    expect(entry?.activity).toBe("sleep");
  });

  it("returns dusk entry for hour 18–19", () => {
    const entry18 = resolveScheduleEntry(BASE_SCHEDULE, 18);
    expect(entry18?.activity).toBe("eat");
    const entry19 = resolveScheduleEntry(BASE_SCHEDULE, 19);
    expect(entry19?.activity).toBe("eat");
  });

  it("handles unsorted schedule by sorting internally", () => {
    const unsorted: NpcScheduleEntry[] = [
      { hour: 18, activity: "eat", position: { x: 2, z: 3 } },
      { hour: 6, activity: "wake", position: { x: 1, z: 1 } },
    ];
    const entry = resolveScheduleEntry(unsorted, 12);
    expect(entry?.activity).toBe("wake"); // hour 6 is last before 12
  });

  it("returns last entry for hour 23 (end of day)", () => {
    const entry = resolveScheduleEntry(BASE_SCHEDULE, 23);
    expect(entry?.activity).toBe("sleep");
  });

  it("returns correct entry at exact boundary of next slot", () => {
    // hour 18 advances from "work" to "eat"
    const before = resolveScheduleEntry(BASE_SCHEDULE, 17);
    expect(before?.activity).toBe("work");
    const at = resolveScheduleEntry(BASE_SCHEDULE, 18);
    expect(at?.activity).toBe("eat");
  });
});

// ── activityToAnimState ───────────────────────────────────────────────────────

describe("activityToAnimState (Spec §19.5)", () => {
  it("maps 'sleep' to 'sleep'", () => {
    expect(activityToAnimState("sleep")).toBe("sleep");
  });

  it("maps 'walk' to 'walk'", () => {
    expect(activityToAnimState("walk")).toBe("walk");
  });

  it("maps 'talk' to 'talk'", () => {
    expect(activityToAnimState("talk")).toBe("talk");
  });

  it("maps 'work' to 'work'", () => {
    expect(activityToAnimState("work")).toBe("work");
  });

  it("maps unknown activities to 'idle'", () => {
    expect(activityToAnimState("wake")).toBe("idle");
    expect(activityToAnimState("eat")).toBe("idle");
    expect(activityToAnimState("patrol")).toBe("idle");
    expect(activityToAnimState("")).toBe("idle");
  });
});

// ── isAtPosition ─────────────────────────────────────────────────────────────

describe("isAtPosition (Spec §19.5)", () => {
  it("returns true when at exact position", () => {
    expect(isAtPosition(5, 5, 5, 5)).toBe(true);
  });

  it("returns true within default tolerance 0.5", () => {
    expect(isAtPosition(5.3, 5.3, 5, 5)).toBe(true);
  });

  it("returns false beyond default tolerance", () => {
    expect(isAtPosition(6, 5, 5, 5)).toBe(false);
  });

  it("respects custom tolerance — inside", () => {
    expect(isAtPosition(5, 5, 5, 7, 3)).toBe(true); // distance 2, tolerance 3
  });

  it("respects custom tolerance — outside", () => {
    expect(isAtPosition(5, 5, 5, 10, 3)).toBe(false); // distance 5, tolerance 3
  });

  it("returns false when far from target", () => {
    expect(isAtPosition(0, 0, 10, 10)).toBe(false);
  });
});

// ── tickNpcSchedule ───────────────────────────────────────────────────────────

describe("tickNpcSchedule (Spec §19.5)", () => {
  const grid = makeGrid();

  it("returns triggered:false and idle for empty schedule", () => {
    const result = tickNpcSchedule([], "npc-empty", 0, 0, 10, grid);
    expect(result.triggered).toBe(false);
    expect(result.animState).toBe("idle");
    expect(result.targetX).toBe(0);
    expect(result.targetZ).toBe(0);
  });

  it("triggers movement on first tick (no prior state)", () => {
    const result = tickNpcSchedule(BASE_SCHEDULE, "npc-first", 0, 0, 10, grid);
    expect(result.triggered).toBe(true);
    expect(mockStartNpcPath).toHaveBeenCalledTimes(1);
  });

  it("returns correct animState for active entry at hour 10 (work)", () => {
    const result = tickNpcSchedule(BASE_SCHEDULE, "npc-anim", 0, 0, 10, grid);
    expect(result.animState).toBe("work");
  });

  it("does NOT re-trigger movement when same schedule slot is still active", () => {
    tickNpcSchedule(BASE_SCHEDULE, "npc-same", 0, 0, 10, grid);
    mockStartNpcPath.mockClear();
    // Still hour 10 → same slot
    tickNpcSchedule(BASE_SCHEDULE, "npc-same", 0, 0, 10, grid);
    expect(mockStartNpcPath).not.toHaveBeenCalled();
  });

  it("triggers movement when hour advances to a new schedule slot", () => {
    tickNpcSchedule(BASE_SCHEDULE, "npc-adv", 0, 0, 10, grid);
    mockStartNpcPath.mockClear();
    tickNpcSchedule(BASE_SCHEDULE, "npc-adv", 0, 0, 18, grid); // new slot
    expect(mockStartNpcPath).toHaveBeenCalledTimes(1);
  });

  it("returns target position from active schedule entry", () => {
    const result = tickNpcSchedule(BASE_SCHEDULE, "npc-pos", 0, 0, 8, grid);
    expect(result.targetX).toBe(5);
    expect(result.targetZ).toBe(5);
  });

  it("returns triggered:false when startNpcPath returns false (no path)", () => {
    mockStartNpcPath.mockReturnValue(false);
    const result = tickNpcSchedule(BASE_SCHEDULE, "npc-nopath", 0, 0, 10, grid);
    expect(result.triggered).toBe(false);
  });

  it("reflects overnight wrap — hour 3 maps to sleep slot", () => {
    const result = tickNpcSchedule(BASE_SCHEDULE, "npc-night", 0, 0, 3, grid);
    expect(result.animState).toBe("sleep");
    expect(result.targetX).toBe(1);
    expect(result.targetZ).toBe(1);
  });

  it("tracks multiple NPCs independently", () => {
    tickNpcSchedule(BASE_SCHEDULE, "npc-a", 0, 0, 10, grid);
    tickNpcSchedule(BASE_SCHEDULE, "npc-b", 0, 0, 10, grid);
    mockStartNpcPath.mockClear();
    // Advance npc-a to new slot, keep npc-b same
    tickNpcSchedule(BASE_SCHEDULE, "npc-a", 0, 0, 18, grid);
    tickNpcSchedule(BASE_SCHEDULE, "npc-b", 0, 0, 10, grid);
    expect(mockStartNpcPath).toHaveBeenCalledTimes(1); // only npc-a triggered
  });
});

// ── clearScheduleState ────────────────────────────────────────────────────────

describe("clearScheduleState (Spec §19.5)", () => {
  it("re-triggers movement after clearing a single NPC's state", () => {
    const grid = makeGrid();
    tickNpcSchedule(BASE_SCHEDULE, "npc-clr", 0, 0, 10, grid);
    mockStartNpcPath.mockClear();
    clearScheduleState("npc-clr");
    tickNpcSchedule(BASE_SCHEDULE, "npc-clr", 0, 0, 10, grid);
    expect(mockStartNpcPath).toHaveBeenCalledTimes(1);
  });

  it("is safe to call for an unknown entity", () => {
    expect(() => clearScheduleState("ghost")).not.toThrow();
  });

  it("does not affect other NPCs when clearing one", () => {
    const grid = makeGrid();
    tickNpcSchedule(BASE_SCHEDULE, "npc-keep", 0, 0, 10, grid);
    tickNpcSchedule(BASE_SCHEDULE, "npc-del", 0, 0, 10, grid);
    mockStartNpcPath.mockClear();
    clearScheduleState("npc-del");
    // npc-keep still has state — no re-trigger
    tickNpcSchedule(BASE_SCHEDULE, "npc-keep", 0, 0, 10, grid);
    expect(mockStartNpcPath).not.toHaveBeenCalled();
  });
});

// ── clearAllScheduleStates ────────────────────────────────────────────────────

describe("clearAllScheduleStates (Spec §19.5)", () => {
  it("re-triggers movement for all NPCs after clearing all states", () => {
    const grid = makeGrid();
    tickNpcSchedule(BASE_SCHEDULE, "npc-x", 0, 0, 10, grid);
    tickNpcSchedule(BASE_SCHEDULE, "npc-y", 0, 0, 10, grid);
    mockStartNpcPath.mockClear();
    clearAllScheduleStates();
    tickNpcSchedule(BASE_SCHEDULE, "npc-x", 0, 0, 10, grid);
    tickNpcSchedule(BASE_SCHEDULE, "npc-y", 0, 0, 10, grid);
    expect(mockStartNpcPath).toHaveBeenCalledTimes(2);
  });

  it("is safe to call when no states are tracked", () => {
    expect(() => clearAllScheduleStates()).not.toThrow();
  });
});
