import {
  getZoneBonuses,
  getZoneBonusMagnitude,
  hasZoneBonus,
  type ZoneType,
} from "./zoneBonuses";

describe("getZoneBonuses", () => {
  it("returns growth_boost for grove", () => {
    const bonuses = getZoneBonuses("grove");
    expect(bonuses).toEqual([{ type: "growth_boost", magnitude: 0.1 }]);
  });

  it("returns two bonuses for clearing", () => {
    const bonuses = getZoneBonuses("clearing");
    expect(bonuses).toHaveLength(2);
    expect(bonuses).toContainEqual({ type: "xp_boost", magnitude: 0.15 });
    expect(bonuses).toContainEqual({ type: "water_retention", magnitude: 0.1 });
  });

  it("returns harvest_boost for forest", () => {
    const bonuses = getZoneBonuses("forest");
    expect(bonuses).toEqual([{ type: "harvest_boost", magnitude: 0.2 }]);
  });

  it("returns stamina_regen for path", () => {
    const bonuses = getZoneBonuses("path");
    expect(bonuses).toEqual([{ type: "stamina_regen", magnitude: 0.1 }]);
  });

  it("returns two bonuses for settlement", () => {
    const bonuses = getZoneBonuses("settlement");
    expect(bonuses).toHaveLength(2);
    expect(bonuses).toContainEqual({ type: "stamina_regen", magnitude: 0.2 });
    expect(bonuses).toContainEqual({ type: "xp_boost", magnitude: 0.1 });
  });

  it("returns empty array for unknown zone type", () => {
    const bonuses = getZoneBonuses("unknown" as ZoneType);
    expect(bonuses).toEqual([]);
  });
});

describe("getZoneBonusMagnitude", () => {
  it("returns correct magnitude for grove growth_boost", () => {
    expect(getZoneBonusMagnitude("grove", "growth_boost")).toBe(0.1);
  });

  it("returns 0 for a bonus type a zone does not have", () => {
    expect(getZoneBonusMagnitude("grove", "harvest_boost")).toBe(0);
  });

  it("returns settlement stamina_regen magnitude", () => {
    expect(getZoneBonusMagnitude("settlement", "stamina_regen")).toBe(0.2);
  });

  it("returns 0 for unknown zone type", () => {
    expect(getZoneBonusMagnitude("unknown" as ZoneType, "growth_boost")).toBe(
      0,
    );
  });
});

describe("hasZoneBonus", () => {
  const allZoneTypes: ZoneType[] = [
    "grove",
    "clearing",
    "forest",
    "path",
    "settlement",
  ];

  it("grove has growth_boost", () => {
    expect(hasZoneBonus("grove", "growth_boost")).toBe(true);
  });

  it("grove does not have harvest_boost", () => {
    expect(hasZoneBonus("grove", "harvest_boost")).toBe(false);
  });

  it("clearing has xp_boost", () => {
    expect(hasZoneBonus("clearing", "xp_boost")).toBe(true);
  });

  it("clearing has water_retention", () => {
    expect(hasZoneBonus("clearing", "water_retention")).toBe(true);
  });

  it("forest has harvest_boost", () => {
    expect(hasZoneBonus("forest", "harvest_boost")).toBe(true);
  });

  it("path has stamina_regen", () => {
    expect(hasZoneBonus("path", "stamina_regen")).toBe(true);
  });

  it("settlement has both stamina_regen and xp_boost", () => {
    expect(hasZoneBonus("settlement", "stamina_regen")).toBe(true);
    expect(hasZoneBonus("settlement", "xp_boost")).toBe(true);
  });

  it("returns false for unknown zone type", () => {
    expect(hasZoneBonus("unknown" as ZoneType, "growth_boost")).toBe(false);
  });

  it("every zone type returns at least one bonus", () => {
    for (const zt of allZoneTypes) {
      const bonuses = getZoneBonuses(zt);
      expect(bonuses.length).toBeGreaterThan(0);
    }
  });
});
