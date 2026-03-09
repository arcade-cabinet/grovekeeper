/**
 * dialogueAnimations tests (Spec SS33.5).
 *
 * Tests for typing animation timing, staggered slide-in, and portrait color utils.
 */

import {
  choiceSlideDelay,
  getVisibleCharCount,
  isTypingComplete,
  nameToHue,
  portraitBgColor,
  portraitColor,
  SLIDE_BASE_DELAY_MS,
  SLIDE_STAGGER_MS,
  TYPING_SPEED_MS,
  typingDuration,
} from "./dialogueAnimations.ts";

// ---------------------------------------------------------------------------
// Typing animation
// ---------------------------------------------------------------------------

describe("getVisibleCharCount (Spec SS33.5)", () => {
  it("returns 0 at elapsed 0", () => {
    expect(getVisibleCharCount("Hello", 0)).toBe(0);
  });

  it("returns full length when elapsed exceeds total duration", () => {
    const text = "Hello";
    expect(getVisibleCharCount(text, text.length * TYPING_SPEED_MS + 100)).toBe(text.length);
  });

  it("returns partial count mid-animation", () => {
    const text = "Hello World";
    const elapsed = 3 * TYPING_SPEED_MS;
    expect(getVisibleCharCount(text, elapsed)).toBe(3);
  });

  it("returns full length for zero speed", () => {
    expect(getVisibleCharCount("Test", 0, 0)).toBe(4);
  });

  it("returns 0 for negative elapsed", () => {
    expect(getVisibleCharCount("Test", -100)).toBe(0);
  });

  it("handles empty string", () => {
    expect(getVisibleCharCount("", 1000)).toBe(0);
  });
});

describe("isTypingComplete (Spec SS33.5)", () => {
  it("returns false at start", () => {
    expect(isTypingComplete("Hello", 0)).toBe(false);
  });

  it("returns true when all chars revealed", () => {
    const text = "Hi";
    expect(isTypingComplete(text, text.length * TYPING_SPEED_MS)).toBe(true);
  });

  it("returns true for empty string immediately", () => {
    expect(isTypingComplete("", 0)).toBe(true);
  });
});

describe("typingDuration (Spec SS33.5)", () => {
  it("returns text.length * speed", () => {
    expect(typingDuration("Hello")).toBe(5 * TYPING_SPEED_MS);
  });

  it("returns 0 for empty string", () => {
    expect(typingDuration("")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Staggered slide-in
// ---------------------------------------------------------------------------

describe("choiceSlideDelay (Spec SS33.5)", () => {
  it("returns base delay for index 0", () => {
    expect(choiceSlideDelay(0)).toBe(SLIDE_BASE_DELAY_MS);
  });

  it("staggers linearly", () => {
    expect(choiceSlideDelay(1)).toBe(SLIDE_BASE_DELAY_MS + SLIDE_STAGGER_MS);
    expect(choiceSlideDelay(2)).toBe(SLIDE_BASE_DELAY_MS + 2 * SLIDE_STAGGER_MS);
  });
});

// ---------------------------------------------------------------------------
// Portrait color
// ---------------------------------------------------------------------------

describe("nameToHue (Spec SS33.5)", () => {
  it("returns a value in [0, 360)", () => {
    const hue = nameToHue("Elder Birch");
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it("is deterministic", () => {
    expect(nameToHue("Root")).toBe(nameToHue("Root"));
  });

  it("produces different hues for different names", () => {
    expect(nameToHue("Alice")).not.toBe(nameToHue("Bob"));
  });
});

describe("portraitColor (Spec SS33.5)", () => {
  it("returns an hsl string", () => {
    expect(portraitColor("Npc")).toMatch(/^hsl\(\d+, 55%, 45%\)$/);
  });
});

describe("portraitBgColor (Spec SS33.5)", () => {
  it("returns an hsl string with lighter lightness", () => {
    expect(portraitBgColor("Npc")).toMatch(/^hsl\(\d+, 50%, 85%\)$/);
  });
});
