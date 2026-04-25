/**
 * Scripted Spirit lines tests — Sub-wave C.
 */
import { describe, expect, it } from "vitest";
import {
  SCRIPTED_LINE_HISTORY_IDS,
  SCRIPTED_LINE_PHRASE_IDS,
  SCRIPTED_SPIRIT_LINES,
} from "./scripted-spirit-lines";

describe("scripted-spirit-lines", () => {
  it("exposes line1, line2, line3", () => {
    expect(Object.keys(SCRIPTED_SPIRIT_LINES).sort()).toEqual([
      "line1",
      "line2",
      "line3",
    ]);
  });

  it("each line is a non-empty string with at least 12 characters", () => {
    for (const text of Object.values(SCRIPTED_SPIRIT_LINES)) {
      expect(typeof text).toBe("string");
      expect(text.trim().length).toBeGreaterThan(12);
    }
  });

  it("line1 mentions the hearth — it teaches the player the claim ritual", () => {
    expect(SCRIPTED_SPIRIT_LINES.line1.toLowerCase()).toContain("hearth");
  });

  it("line2 acknowledges the grove is now the player's", () => {
    expect(SCRIPTED_SPIRIT_LINES.line2.toLowerCase()).toMatch(/grove|yours/);
  });

  it("line3 gestures at the wild and the swing tool", () => {
    expect(SCRIPTED_SPIRIT_LINES.line3.toLowerCase()).toMatch(/wild|swing/);
  });

  it("history ids are namespaced and stable", () => {
    expect(SCRIPTED_LINE_HISTORY_IDS.line1).toBe("scripted-line1");
    expect(SCRIPTED_LINE_HISTORY_IDS.line2).toBe("scripted-line2");
    expect(SCRIPTED_LINE_HISTORY_IDS.line3).toBe("scripted-line3");
    for (const id of Object.values(SCRIPTED_LINE_HISTORY_IDS)) {
      expect(id.startsWith("grove-")).toBe(false);
    }
  });

  it("phrase ids are namespaced under the scripted scope", () => {
    for (const id of Object.values(SCRIPTED_LINE_PHRASE_IDS)) {
      expect(id.startsWith("spirit:scripted:")).toBe(true);
    }
  });
});
