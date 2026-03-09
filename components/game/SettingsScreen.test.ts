/**
 * SettingsScreen tests (Spec §26)
 *
 * Tests the pure settingsLogic helpers — no React/RN import chain, no mocks needed.
 */

import {
  applySettingsUpdate,
  clampDrawDistance,
  clampTouchSensitivity,
  clampVolume,
  formatDrawDistance,
  formatTouchSensitivity,
  formatVolumePct,
  SETTINGS_DEFAULTS,
} from "./settingsLogic.ts";

// ---------------------------------------------------------------------------
// clampVolume
// ---------------------------------------------------------------------------

describe("clampVolume (Spec §26)", () => {
  it("clamps below 0 to 0", () => {
    expect(clampVolume(-1)).toBe(0);
  });

  it("clamps above 1 to 1", () => {
    expect(clampVolume(1.5)).toBe(1);
  });

  it("preserves valid value", () => {
    expect(clampVolume(0.5)).toBe(0.5);
  });

  it("rounds to 2 decimal places", () => {
    expect(clampVolume(0.555)).toBe(0.56);
  });

  it("handles exact bounds", () => {
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// clampDrawDistance
// ---------------------------------------------------------------------------

describe("clampDrawDistance (Spec §26)", () => {
  it("clamps below 1 to 1", () => {
    expect(clampDrawDistance(0)).toBe(1);
  });

  it("clamps above 5 to 5", () => {
    expect(clampDrawDistance(10)).toBe(5);
  });

  it("preserves valid value", () => {
    expect(clampDrawDistance(3)).toBe(3);
  });

  it("rounds float to nearest integer", () => {
    expect(clampDrawDistance(2.7)).toBe(3);
    expect(clampDrawDistance(2.3)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// clampTouchSensitivity
// ---------------------------------------------------------------------------

describe("clampTouchSensitivity (Spec §26)", () => {
  it("clamps below 0.5 to 0.5", () => {
    expect(clampTouchSensitivity(0)).toBe(0.5);
  });

  it("clamps above 2.0 to 2.0", () => {
    expect(clampTouchSensitivity(5)).toBe(2.0);
  });

  it("preserves valid value", () => {
    expect(clampTouchSensitivity(1.0)).toBe(1.0);
  });

  it("rounds to 2 decimal places", () => {
    expect(clampTouchSensitivity(1.555)).toBe(1.56);
  });
});

// ---------------------------------------------------------------------------
// applySettingsUpdate
// ---------------------------------------------------------------------------

describe("applySettingsUpdate (Spec §26)", () => {
  it("merges partial update into current", () => {
    const result = applySettingsUpdate(SETTINGS_DEFAULTS, { masterVolume: 0.5 });
    expect(result.masterVolume).toBe(0.5);
    expect(result.sfxVolume).toBe(SETTINGS_DEFAULTS.sfxVolume);
  });

  it("clamps merged volume fields", () => {
    const result = applySettingsUpdate(SETTINGS_DEFAULTS, { masterVolume: 1.5 });
    expect(result.masterVolume).toBe(1);
  });

  it("clamps merged drawDistance", () => {
    const result = applySettingsUpdate(SETTINGS_DEFAULTS, { drawDistance: 99 });
    expect(result.drawDistance).toBe(5);
  });

  it("clamps merged touchSensitivity", () => {
    const result = applySettingsUpdate(SETTINGS_DEFAULTS, { touchSensitivity: 0.1 });
    expect(result.touchSensitivity).toBe(0.5);
  });

  it("passes boolean fields through unmodified", () => {
    const result = applySettingsUpdate(SETTINGS_DEFAULTS, {
      reducedMotion: true,
    });
    expect(result.reducedMotion).toBe(true);
  });

  it("does not mutate the current object", () => {
    const current = { ...SETTINGS_DEFAULTS };
    applySettingsUpdate(current, { masterVolume: 0.2 });
    expect(current.masterVolume).toBe(SETTINGS_DEFAULTS.masterVolume);
  });
});

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

describe("formatVolumePct (Spec §26)", () => {
  it("formats 1.0 as 100%", () => {
    expect(formatVolumePct(1.0)).toBe("100%");
  });

  it("formats 0 as 0%", () => {
    expect(formatVolumePct(0)).toBe("0%");
  });

  it("formats 0.5 as 50%", () => {
    expect(formatVolumePct(0.5)).toBe("50%");
  });
});

describe("formatDrawDistance (Spec §26)", () => {
  it("labels 1 as Near", () => {
    expect(formatDrawDistance(1)).toBe("Near");
  });

  it("labels 3 as Medium", () => {
    expect(formatDrawDistance(3)).toBe("Medium");
  });

  it("labels 5 as Max", () => {
    expect(formatDrawDistance(5)).toBe("Max");
  });
});

describe("formatTouchSensitivity (Spec §26)", () => {
  it("formats 1.0 as 1.0×", () => {
    expect(formatTouchSensitivity(1.0)).toBe("1.0×");
  });

  it("formats 2.0 as 2.0×", () => {
    expect(formatTouchSensitivity(2.0)).toBe("2.0×");
  });
});
