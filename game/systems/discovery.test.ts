import { discoverZone, isZoneDiscovered } from "./discovery";

describe("discoverZone", () => {
  it("adds a new zone to discovered list", () => {
    const result = discoverZone([], "zone-1");
    expect(result.newZones).toEqual(["zone-1"]);
    expect(result.isNew).toBe(true);
  });

  it("returns isNew:false for already-discovered zone", () => {
    const result = discoverZone(["zone-1"], "zone-1");
    expect(result.isNew).toBe(false);
    expect(result.newZones).toEqual(["zone-1"]);
  });

  it("preserves existing zones when adding new one", () => {
    const result = discoverZone(["zone-1", "zone-2"], "zone-3");
    expect(result.newZones).toEqual(["zone-1", "zone-2", "zone-3"]);
    expect(result.isNew).toBe(true);
  });

  it("does not duplicate zones", () => {
    const result = discoverZone(["zone-1"], "zone-1");
    expect(result.newZones).toHaveLength(1);
  });

  it("does not mutate original array", () => {
    const original = ["zone-1"];
    discoverZone(original, "zone-2");
    expect(original).toEqual(["zone-1"]);
  });

  it("returns same reference for already-discovered zone", () => {
    const zones = ["zone-1"];
    const result = discoverZone(zones, "zone-1");
    expect(result.newZones).toBe(zones);
  });
});

describe("isZoneDiscovered", () => {
  it("returns true for discovered zone", () => {
    expect(isZoneDiscovered(["zone-1", "zone-2"], "zone-1")).toBe(true);
  });

  it("returns false for undiscovered zone", () => {
    expect(isZoneDiscovered(["zone-1"], "zone-2")).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(isZoneDiscovered([], "zone-1")).toBe(false);
  });

  it("handles string matching correctly", () => {
    expect(isZoneDiscovered(["grove-1"], "grove-1")).toBe(true);
    expect(isZoneDiscovered(["grove-1"], "grove-2")).toBe(false);
  });
});
