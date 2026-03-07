/**
 * Day/Night Cycle System tests (Spec §31.3)
 *
 * All tests operate on pure functions — no Three.js, R3F, or ECS needed.
 */

import {
  classifyTimeOfDay,
  computeGameHour,
  computeLighting,
  computeSeason,
  computeStarIntensity,
  computeSunAngle,
  initDayNight,
  tickDayNight,
} from "@/game/systems/dayNight";
import type { DayNightComponent, SkyComponent } from "@/game/ecs/components/procedural/atmosphere";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDayNight(overrides: Partial<DayNightComponent> = {}): DayNightComponent {
  return {
    gameHour: 6,
    timeOfDay: "dawn",
    dayNumber: 0,
    season: "spring",
    ambientColor: "#FFB347",
    ambientIntensity: 0.3,
    directionalColor: "#FF7F50",
    directionalIntensity: 0.4,
    shadowOpacity: 0.3,
    ...overrides,
  };
}

function makeSky(overrides: Partial<SkyComponent> = {}): SkyComponent {
  return {
    sunAngle: 0,
    sunAzimuth: 0,
    gradientStops: [],
    starIntensity: 0,
    moonPhase: 0,
    cloudCoverage: 0,
    cloudSpeed: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeGameHour
// ---------------------------------------------------------------------------

describe("computeGameHour (Spec §31.3)", () => {
  it("returns 0 at elapsed=0", () => {
    expect(computeGameHour(0)).toBe(0);
  });

  it("returns 12 at half a day (300s)", () => {
    expect(computeGameHour(300)).toBeCloseTo(12, 5);
  });

  it("returns 0 at a full day (600s) — wraps", () => {
    expect(computeGameHour(600)).toBeCloseTo(0, 5);
  });

  it("returns 1 at 25s (one game hour)", () => {
    expect(computeGameHour(25)).toBeCloseTo(1, 5);
  });

  it("returns 6 at 150s (quarter day)", () => {
    expect(computeGameHour(150)).toBeCloseTo(6, 5);
  });

  it("wraps correctly after 2 full days (1200s)", () => {
    expect(computeGameHour(1200)).toBeCloseTo(0, 5);
  });

  it("600s day length — each second advances 0.04 game hours", () => {
    expect(computeGameHour(1)).toBeCloseTo(24 / 600, 5);
  });
});

// ---------------------------------------------------------------------------
// classifyTimeOfDay
// ---------------------------------------------------------------------------

describe("classifyTimeOfDay (Spec §31.3)", () => {
  it("h=5.5 → dawn", () => {
    expect(classifyTimeOfDay(5.5)).toBe("dawn");
  });

  it("h=7 boundary → morning (inclusive start)", () => {
    expect(classifyTimeOfDay(7)).toBe("morning");
  });

  it("h=9 → morning", () => {
    expect(classifyTimeOfDay(9)).toBe("morning");
  });

  it("h=11 boundary → noon", () => {
    expect(classifyTimeOfDay(11)).toBe("noon");
  });

  it("h=12 → noon", () => {
    expect(classifyTimeOfDay(12)).toBe("noon");
  });

  it("h=13 boundary → afternoon", () => {
    expect(classifyTimeOfDay(13)).toBe("afternoon");
  });

  it("h=15 → afternoon", () => {
    expect(classifyTimeOfDay(15)).toBe("afternoon");
  });

  it("h=17 boundary → dusk", () => {
    expect(classifyTimeOfDay(17)).toBe("dusk");
  });

  it("h=18 → dusk", () => {
    expect(classifyTimeOfDay(18)).toBe("dusk");
  });

  it("h=19 boundary → evening", () => {
    expect(classifyTimeOfDay(19)).toBe("evening");
  });

  it("h=20 → evening", () => {
    expect(classifyTimeOfDay(20)).toBe("evening");
  });

  it("h=21 boundary → night", () => {
    expect(classifyTimeOfDay(21)).toBe("night");
  });

  it("h=22 → night", () => {
    expect(classifyTimeOfDay(22)).toBe("night");
  });

  it("h=23 boundary → midnight", () => {
    expect(classifyTimeOfDay(23)).toBe("midnight");
  });

  it("h=2 → midnight (pre-dawn)", () => {
    expect(classifyTimeOfDay(2)).toBe("midnight");
  });

  it("h=4.9 → midnight (just before dawn)", () => {
    expect(classifyTimeOfDay(4.9)).toBe("midnight");
  });

  it("h=5 boundary → dawn", () => {
    expect(classifyTimeOfDay(5)).toBe("dawn");
  });
});

// ---------------------------------------------------------------------------
// computeSunAngle
// ---------------------------------------------------------------------------

describe("computeSunAngle (Spec §31.3)", () => {
  it("returns ~0 at h=6 (sunrise horizon)", () => {
    expect(computeSunAngle(6)).toBeCloseTo(0, 4);
  });

  it("returns PI/2 at h=12 (zenith)", () => {
    expect(computeSunAngle(12)).toBeCloseTo(Math.PI / 2, 4);
  });

  it("returns ~0 at h=18 (sunset horizon)", () => {
    expect(computeSunAngle(18)).toBeCloseTo(0, 4);
  });

  it("returns -PI/2 at h=0 (deepest below horizon)", () => {
    expect(computeSunAngle(0)).toBeCloseTo(-Math.PI / 2, 4);
  });

  it("returns -PI/2 at h=24 (wraps — same as midnight)", () => {
    expect(computeSunAngle(24)).toBeCloseTo(-Math.PI / 2, 4);
  });

  it("sun is above horizon during daytime (h=8)", () => {
    expect(computeSunAngle(8)).toBeGreaterThan(0);
  });

  it("sun is below horizon at night (h=22)", () => {
    expect(computeSunAngle(22)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// computeStarIntensity
// ---------------------------------------------------------------------------

describe("computeStarIntensity (Spec §31.3)", () => {
  it("noon → 0 (no stars at midday)", () => {
    expect(computeStarIntensity("noon")).toBe(0);
  });

  it("morning → 0", () => {
    expect(computeStarIntensity("morning")).toBe(0);
  });

  it("afternoon → 0", () => {
    expect(computeStarIntensity("afternoon")).toBe(0);
  });

  it("night → 1 (full stars)", () => {
    expect(computeStarIntensity("night")).toBe(1);
  });

  it("midnight → 1 (full stars)", () => {
    expect(computeStarIntensity("midnight")).toBe(1);
  });

  it("dusk → partial stars (0 < x < 1)", () => {
    const v = computeStarIntensity("dusk");
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });

  it("dawn → partial stars (0 < x < 1)", () => {
    const v = computeStarIntensity("dawn");
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// computeLighting
// ---------------------------------------------------------------------------

describe("computeLighting (Spec §31.3)", () => {
  it("noon → full ambient intensity (1.0)", () => {
    expect(computeLighting("noon").ambientIntensity).toBe(1.0);
  });

  it("noon → full directional intensity (1.0)", () => {
    expect(computeLighting("noon").directionalIntensity).toBe(1.0);
  });

  it("noon → full shadow opacity (1.0)", () => {
    expect(computeLighting("noon").shadowOpacity).toBe(1.0);
  });

  it("night → zero shadow opacity", () => {
    expect(computeLighting("night").shadowOpacity).toBe(0.0);
  });

  it("midnight → zero shadow opacity", () => {
    expect(computeLighting("midnight").shadowOpacity).toBe(0.0);
  });

  it("evening → zero shadow opacity", () => {
    expect(computeLighting("evening").shadowOpacity).toBe(0.0);
  });

  it("dawn → reduced shadow opacity (fades at dawn)", () => {
    expect(computeLighting("dawn").shadowOpacity).toBeLessThan(0.5);
  });

  it("dusk → reduced shadow opacity (fades at dusk)", () => {
    expect(computeLighting("dusk").shadowOpacity).toBeLessThan(0.5);
  });

  it("returns non-empty color strings for all slots", () => {
    const slots = ["dawn", "morning", "noon", "afternoon", "dusk", "evening", "night", "midnight"] as const;
    for (const slot of slots) {
      const l = computeLighting(slot);
      expect(l.ambientColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(l.directionalColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("night has lower ambient intensity than noon", () => {
    expect(computeLighting("night").ambientIntensity).toBeLessThan(computeLighting("noon").ambientIntensity);
  });
});

// ---------------------------------------------------------------------------
// computeSeason
// ---------------------------------------------------------------------------

describe("computeSeason (Spec §31.3)", () => {
  it("day 0 → spring", () => {
    expect(computeSeason(0)).toBe("spring");
  });

  it("day 6 → spring (last day of spring)", () => {
    expect(computeSeason(6)).toBe("spring");
  });

  it("day 7 → summer", () => {
    expect(computeSeason(7)).toBe("summer");
  });

  it("day 13 → summer", () => {
    expect(computeSeason(13)).toBe("summer");
  });

  it("day 14 → autumn", () => {
    expect(computeSeason(14)).toBe("autumn");
  });

  it("day 21 → winter", () => {
    expect(computeSeason(21)).toBe("winter");
  });

  it("day 28 → spring (cycle wraps)", () => {
    expect(computeSeason(28)).toBe("spring");
  });
});

// ---------------------------------------------------------------------------
// initDayNight
// ---------------------------------------------------------------------------

describe("initDayNight (Spec §31.3)", () => {
  it("starts at hour 6 (dawn)", () => {
    expect(initDayNight().gameHour).toBe(6);
  });

  it("starts at dawn timeOfDay", () => {
    expect(initDayNight().timeOfDay).toBe("dawn");
  });

  it("starts at day 0", () => {
    expect(initDayNight().dayNumber).toBe(0);
  });

  it("starts in spring", () => {
    expect(initDayNight().season).toBe("spring");
  });

  it("has valid lighting fields set", () => {
    const dn = initDayNight();
    expect(typeof dn.ambientColor).toBe("string");
    expect(dn.ambientIntensity).toBeGreaterThan(0);
    expect(typeof dn.directionalColor).toBe("string");
    expect(dn.directionalIntensity).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// tickDayNight
// ---------------------------------------------------------------------------

describe("tickDayNight (Spec §31.3)", () => {
  it("advances gameHour proportionally — 25s = 1 game hour", () => {
    const dn = makeDayNight({ gameHour: 10 });
    const sky = makeSky();
    tickDayNight(dn, sky, 25);
    expect(dn.gameHour).toBeCloseTo(11, 5);
  });

  it("advances gameHour fractionally — 12.5s = 0.5 game hours", () => {
    const dn = makeDayNight({ gameHour: 10 });
    const sky = makeSky();
    tickDayNight(dn, sky, 12.5);
    expect(dn.gameHour).toBeCloseTo(10.5, 4);
  });

  it("wraps gameHour at 24 and increments dayNumber", () => {
    const dn = makeDayNight({ gameHour: 23.99 });
    const sky = makeSky();
    tickDayNight(dn, sky, 25); // push past 24
    expect(dn.gameHour).toBeLessThan(24);
    expect(dn.dayNumber).toBe(1);
  });

  it("updates timeOfDay after tick", () => {
    const dn = makeDayNight({ gameHour: 10.5, timeOfDay: "morning" });
    const sky = makeSky();
    tickDayNight(dn, sky, 0.001); // tiny tick, still morning
    expect(dn.timeOfDay).toBe("morning");
  });

  it("changes timeOfDay when crossing a slot boundary", () => {
    // Start just before noon boundary (11h)
    const dn = makeDayNight({ gameHour: 10.99, timeOfDay: "morning" });
    const sky = makeSky();
    tickDayNight(dn, sky, 25 * 0.1); // push past 11h
    expect(dn.timeOfDay).toBe("noon");
  });

  it("updates sky.sunAngle", () => {
    const dn = makeDayNight({ gameHour: 12 });
    const sky = makeSky({ sunAngle: 0 });
    tickDayNight(dn, sky, 0.001);
    expect(sky.sunAngle).toBeGreaterThan(0); // near noon, sun is high
  });

  it("sets sky.sunAngle near PI/2 at noon", () => {
    const dn = makeDayNight({ gameHour: 11.999 });
    const sky = makeSky();
    tickDayNight(dn, sky, 0.001);
    expect(sky.sunAngle).toBeCloseTo(Math.PI / 2, 2);
  });

  it("updates sky.starIntensity to 0 during daytime", () => {
    const dn = makeDayNight({ gameHour: 12, timeOfDay: "noon" });
    const sky = makeSky({ starIntensity: 1 });
    tickDayNight(dn, sky, 0.001);
    expect(sky.starIntensity).toBe(0);
  });

  it("updates sky.starIntensity to 1 at night", () => {
    const dn = makeDayNight({ gameHour: 22, timeOfDay: "night" });
    const sky = makeSky({ starIntensity: 0 });
    tickDayNight(dn, sky, 0.001);
    expect(sky.starIntensity).toBe(1);
  });

  it("updates lighting fields on DayNightComponent", () => {
    const dn = makeDayNight({ gameHour: 12 });
    const sky = makeSky();
    tickDayNight(dn, sky, 0.001);
    expect(dn.ambientIntensity).toBe(1.0); // noon
    expect(dn.shadowOpacity).toBe(1.0);
  });

  it("shadowOpacity is 0 at night", () => {
    const dn = makeDayNight({ gameHour: 22 });
    const sky = makeSky();
    tickDayNight(dn, sky, 0.001);
    expect(dn.shadowOpacity).toBe(0);
  });

  it("full day cycle: 600s tick advances by exactly 24 game hours (wraps)", () => {
    const dn = makeDayNight({ gameHour: 6, dayNumber: 0 });
    const sky = makeSky();
    tickDayNight(dn, sky, 600);
    expect(dn.dayNumber).toBe(1);
    expect(dn.gameHour).toBeCloseTo(6, 5); // same hour, next day
  });

  it("season advances after daysPerSeason days", () => {
    const dn = makeDayNight({ gameHour: 23.99, dayNumber: 6, season: "spring" });
    const sky = makeSky();
    tickDayNight(dn, sky, 25); // push to day 7
    expect(dn.season).toBe("summer");
  });
});
