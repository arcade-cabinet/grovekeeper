/**
 * Tests for MainMenu pure logic (Spec §26).
 *
 * Imports from mainMenuLogic.ts (plain .ts) to avoid triggering the
 * react-native-css-interop JSX runtime crash in Jest.
 */

import {
  hasSave,
  primaryButtonLabel,
  showNewGroveButton,
  treeSummaryText,
} from "./mainMenuLogic.ts";

describe("MainMenu logic (Spec §26)", () => {
  describe("hasSave", () => {
    it("returns false when no trees planted", () => {
      expect(hasSave(0)).toBe(false);
    });

    it("returns true when at least one tree planted", () => {
      expect(hasSave(1)).toBe(true);
    });

    it("returns true for large tree counts", () => {
      expect(hasSave(500)).toBe(true);
    });
  });

  describe("primaryButtonLabel", () => {
    it("returns 'Start Growing' when no save exists", () => {
      expect(primaryButtonLabel(0)).toBe("Start Growing");
    });

    it("returns 'Continue Grove' when save exists", () => {
      expect(primaryButtonLabel(1)).toBe("Continue Grove");
      expect(primaryButtonLabel(42)).toBe("Continue Grove");
    });
  });

  describe("showNewGroveButton", () => {
    it("returns false when no save (New Grove button hidden)", () => {
      expect(showNewGroveButton(0)).toBe(false);
    });

    it("returns true when save exists (New Grove button shown)", () => {
      expect(showNewGroveButton(1)).toBe(true);
    });
  });

  describe("treeSummaryText", () => {
    it("uses singular 'tree' for exactly 1", () => {
      expect(treeSummaryText(1)).toBe("1 tree planted so far");
    });

    it("uses plural 'trees' for 0", () => {
      expect(treeSummaryText(0)).toBe("0 trees planted so far");
    });

    it("uses plural 'trees' for multiple", () => {
      expect(treeSummaryText(23)).toBe("23 trees planted so far");
    });
  });
});
