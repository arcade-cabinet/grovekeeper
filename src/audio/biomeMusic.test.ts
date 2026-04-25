/**
 * Tests for the biome-music coordinator. The coordinator is just a
 * lookup table + two awaited setMusicTrack/setAmbientTrack calls; the
 * point is to verify the table mappings, not re-test the engine.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./audio", () => ({
  setMusicTrack: vi.fn(async () => undefined),
  setAmbientTrack: vi.fn(async () => undefined),
}));

describe("biomeMusic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getTracksForBiome returns a stable music+ambient pair", async () => {
    const { getTracksForBiome } = await import("./biomeMusic");
    expect(getTracksForBiome("menu")).toEqual({
      music: "music.menu",
      ambient: null,
    });
    expect(getTracksForBiome("grove")).toEqual({
      music: "music.grove.forlorn",
      ambient: "ambient.grove",
    });
    expect(getTracksForBiome("meadow")).toEqual({
      music: "music.biome.meadow.calm",
      ambient: "ambient.biome.meadow",
    });
    expect(getTracksForBiome("forest")).toEqual({
      music: "music.biome.forest.chill",
      ambient: "ambient.biome.forest",
    });
    expect(getTracksForBiome("coast")).toEqual({
      music: "music.biome.coast.warm",
      ambient: "ambient.biome.coast",
    });
  });

  it("setBiomeMusic dispatches both channels for meadow", async () => {
    const { setBiomeMusic } = await import("./biomeMusic");
    const audio = await import("./audio");

    await setBiomeMusic("meadow");

    expect(audio.setMusicTrack).toHaveBeenCalledTimes(1);
    expect(audio.setMusicTrack).toHaveBeenCalledWith("music.biome.meadow.calm");
    expect(audio.setAmbientTrack).toHaveBeenCalledTimes(1);
    expect(audio.setAmbientTrack).toHaveBeenCalledWith("ambient.biome.meadow");
  });

  it("setBiomeMusic dispatches both channels for forest", async () => {
    const { setBiomeMusic } = await import("./biomeMusic");
    const audio = await import("./audio");

    await setBiomeMusic("forest");

    expect(audio.setMusicTrack).toHaveBeenCalledWith("music.biome.forest.chill");
    expect(audio.setAmbientTrack).toHaveBeenCalledWith("ambient.biome.forest");
  });

  it("setBiomeMusic dispatches both channels for coast", async () => {
    const { setBiomeMusic } = await import("./biomeMusic");
    const audio = await import("./audio");

    await setBiomeMusic("coast");

    expect(audio.setMusicTrack).toHaveBeenCalledWith("music.biome.coast.warm");
    expect(audio.setAmbientTrack).toHaveBeenCalledWith("ambient.biome.coast");
  });

  it("setBiomeMusic for grove plays the grove bed + ambient", async () => {
    const { setBiomeMusic } = await import("./biomeMusic");
    const audio = await import("./audio");

    await setBiomeMusic("grove");

    expect(audio.setMusicTrack).toHaveBeenCalledWith("music.grove.forlorn");
    expect(audio.setAmbientTrack).toHaveBeenCalledWith("ambient.grove");
  });

  it("setBiomeMusic('menu') plays menu music with no ambient", async () => {
    const { setBiomeMusic } = await import("./biomeMusic");
    const audio = await import("./audio");

    await setBiomeMusic("menu");

    expect(audio.setMusicTrack).toHaveBeenCalledWith("music.menu");
    expect(audio.setAmbientTrack).toHaveBeenCalledWith(null);
  });
});
