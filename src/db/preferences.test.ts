/**
 * Preferences wrapper tests — exercise the typed getPref/setPref/getAllPrefs
 * surface with the in-memory fallback (the test environment has no
 * Capacitor Preferences plugin).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetPrefsForTests,
  getAllPrefs,
  getPref,
  removePref,
  setPref,
} from "./preferences";

beforeEach(() => {
  __resetPrefsForTests();
});

afterEach(() => {
  __resetPrefsForTests();
});

describe("preferences", () => {
  it("returns defaults when nothing is set", async () => {
    expect(await getPref("audio.master")).toBe(1);
    expect(await getPref("graphics.tier")).toBe("auto");
    expect(await getPref("lastPlayedWorldId")).toBe("");
  });

  it("setPref → getPref round-trip preserves types", async () => {
    await setPref("audio.master", 0.42);
    await setPref("graphics.tier", "high");
    await setPref("lastPlayedAt", 12345);
    expect(await getPref("audio.master")).toBe(0.42);
    expect(await getPref("graphics.tier")).toBe("high");
    expect(await getPref("lastPlayedAt")).toBe(12345);
  });

  it("getAllPrefs returns merged defaults + overrides", async () => {
    await setPref("audio.music", 0.3);
    const all = await getAllPrefs();
    expect(all["audio.music"]).toBe(0.3);
    expect(all["audio.sfx"]).toBe(0.9); // default
    expect(all["graphics.tier"]).toBe("auto");
  });

  it("removePref restores the default on next read", async () => {
    await setPref("audio.master", 0);
    await removePref("audio.master");
    expect(await getPref("audio.master")).toBe(1);
  });
});
