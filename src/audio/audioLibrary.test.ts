/**
 * Library coverage: every symbolic id resolves to an asset path that
 * exists in the build-generated manifest. This catches stale ids when
 * the curate step changes a filename.
 */

import { describe, expect, it } from "vitest";
import { ASSET_MANIFEST } from "@/assets/manifest.generated";
import {
  ALL_SOUND_IDS,
  AUDIO_LIBRARY,
  getSoundEntry,
  type SoundId,
} from "./audioLibrary";

// The generated manifest types each entry as a union literal; widen to
// string here so we can membership-check arbitrary paths from the
// audio library without poking at every literal.
const manifestPaths = new Set<string>(ASSET_MANIFEST.map((entry) => entry.path));

describe("audioLibrary", () => {
  it("registers every advertised symbolic id", () => {
    expect(ALL_SOUND_IDS.length).toBeGreaterThan(0);
    for (const id of ALL_SOUND_IDS) {
      expect(AUDIO_LIBRARY[id]).toBeDefined();
    }
  });

  it("every entry resolves to a manifest-known asset", () => {
    const missing: { id: SoundId; path: string }[] = [];
    for (const id of ALL_SOUND_IDS) {
      const entry = AUDIO_LIBRARY[id];
      if (!manifestPaths.has(entry.path)) {
        missing.push({ id, path: entry.path });
      }
    }
    expect(missing).toEqual([]);
  });

  it("every entry declares a known channel", () => {
    const validChannels = new Set(["music", "sfx", "ambient"] as const);
    for (const id of ALL_SOUND_IDS) {
      const entry = AUDIO_LIBRARY[id];
      expect(validChannels.has(entry.channel)).toBe(true);
    }
  });

  it("music + ambient ids declare loop semantics deliberately", () => {
    // Music/ambient default to looped beds, except for the moments
    // category which is one-shot. We assert this explicitly so a
    // future refactor doesn't silently drop the loop hint.
    for (const id of ALL_SOUND_IDS) {
      const entry = AUDIO_LIBRARY[id];
      if (entry.channel === "music" || entry.channel === "ambient") {
        expect(typeof entry.loop).toBe("boolean");
      }
    }
  });

  it("getSoundEntry returns the registered entry", () => {
    expect(getSoundEntry("ui.click").path).toContain("sfx/ui/click");
    expect(getSoundEntry("music.menu").channel).toBe("music");
  });

  it("legacy short ids called from src/actions.ts are present", () => {
    // Wave 5 exists primarily to swap the no-op stub in actions.ts.
    // If either of these ids disappears from the union, the actions.ts
    // call sites stop type-checking.
    expect(AUDIO_LIBRARY.levelUp).toBeDefined();
    expect(AUDIO_LIBRARY.success).toBeDefined();
  });
});
