import { describe, it, expect } from "vitest";
import {
  RESOURCE_TYPES,
  RESOURCE_INFO,
  emptyResources,
} from "./resources";

describe("resources", () => {
  it("RESOURCE_TYPES contains all four types", () => {
    expect(RESOURCE_TYPES).toEqual(["timber", "sap", "fruit", "acorns"]);
  });

  it("RESOURCE_INFO has entry for every resource type", () => {
    for (const type of RESOURCE_TYPES) {
      expect(RESOURCE_INFO[type]).toBeDefined();
      expect(RESOURCE_INFO[type].name).toBeTruthy();
      expect(RESOURCE_INFO[type].icon).toBeTruthy();
    }
  });

  describe("emptyResources", () => {
    it("returns all resources at zero", () => {
      const empty = emptyResources();
      expect(empty).toEqual({ timber: 0, sap: 0, fruit: 0, acorns: 0 });
    });

    it("returns a new object each call (no shared reference)", () => {
      const a = emptyResources();
      const b = emptyResources();
      expect(a).not.toBe(b);
      a.timber = 99;
      expect(b.timber).toBe(0);
    });

    it("has keys for all RESOURCE_TYPES", () => {
      const empty = emptyResources();
      for (const type of RESOURCE_TYPES) {
        expect(type in empty).toBe(true);
      }
    });
  });
});
