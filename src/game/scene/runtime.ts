/**
 * Jolly Pixel runtime bootstrap for Grovekeeper.
 *
 * Wraps `loadRuntime` from `@jolly-pixel/runtime` against a canvas owned
 * by the Solid root. Returns a `SceneHandle` the GameScene component
 * uses to pause/resume/dispose. The pattern mirrors voxel-realms'
 * `src/scene/runtime.ts`, scaled down to a proof-of-life scene with a
 * single placeholder Actor — voxel terrain, biomes, NPCs, and the
 * Gardener GLB land in later RC waves.
 *
 * No Solid here. No reactivity. The canvas is owned by JP; the Solid
 * UI overlay sits above it as a sibling DOM root.
 */

import { loadRuntime, Runtime } from "@jolly-pixel/runtime";
import * as THREE from "three";
import {
  initAudio,
  setBiomeMusic,
  setChannelVolume,
  setMasterVolume,
} from "@/audio";
import { getPref } from "@/db/preferences";
import { SingleChunkActor } from "@/game/world";
import { CameraFollowBehavior } from "./CameraFollowBehavior";
import { PlayerActor } from "./PlayerActor";

export interface SceneHandle {
  runtime: Runtime;
  /** Pause the main loop. */
  pause(): void;
  /** Resume the main loop. */
  resume(): void;
  /** Tear everything down. Safe to call multiple times. */
  dispose(): void;
}

export interface CreateRuntimeOptions {
  /** Whether to overlay JP's perf stats panel. Defaults to false. */
  includePerformanceStats?: boolean;
}

export async function createRuntime(
  canvas: HTMLCanvasElement,
  options: CreateRuntimeOptions = {},
): Promise<SceneHandle> {
  const runtime = new Runtime(canvas, {
    includePerformanceStats: options.includePerformanceStats ?? false,
  });
  const { world } = runtime;

  // Scene background + lights. Replace with biome-driven sky/lighting in
  // the world wave — for now we just want a non-black void so the
  // placeholder cube reads as "alive".
  const sceneSource = world.sceneManager.getSource();
  sceneSource.background = new THREE.Color("#0d1410");
  const ambient = new THREE.AmbientLight(new THREE.Color("#ffffff"), 1.6);
  sceneSource.add(ambient);
  const dir = new THREE.DirectionalLight(new THREE.Color("#fff7e0"), 1.4);
  dir.position.set(20, 40, 30);
  sceneSource.add(dir);

  // Terrain — single meadow chunk at world origin. Wave 9 swaps this
  // for a streaming chunk manager; for now one 16x16xN patch is enough
  // to see the player standing on real ground.
  const terrainActor = world.createActor("terrain");
  terrainActor.addComponentAndGet(SingleChunkActor, {
    chunkX: 0,
    chunkZ: 0,
    worldSeed: 0,
  });

  // Placeholder player Actor. Renders a green cube at the centre of the
  // chunk, sitting on top of the grass surface (groundY + hill bump =
  // SingleChunkActor.SURFACE_Y). The Gardener GLB ModelRenderer
  // replaces the cube in Wave 11a.
  const playerActor = world.createActor("player");
  const playerBehavior = playerActor.addComponentAndGet(PlayerActor, {
    spawn: { x: 8, y: SingleChunkActor.SURFACE_Y + 1, z: 8 },
  });

  // Follow camera. Lerps to the player actor each tick. Offset retuned
  // for the higher spawn so the chunk fills the frame nicely.
  const cameraActor = world.createActor("camera");
  cameraActor.addComponentAndGet(CameraFollowBehavior, {
    player: playerBehavior,
    offset: new THREE.Vector3(0, 8, 12),
  });

  // Audio bootstrap. Registers every symbolic sound id with the engine's
  // AudioLibrary, applies persisted volume preferences, and kicks off
  // the meadow biome music bed as proof-of-life. The first user gesture
  // is what actually un-suspends THREE's audio context (browser
  // autoplay policy); until then the music load completes silently and
  // plays the moment the player taps anywhere.
  initAudio(world);
  // Apply persisted volumes first so the first track inherits them.
  // Promise.all is awaited because Capacitor preferences resolve
  // asynchronously, but each lookup is fast (in-memory on web).
  const [masterVol, musicVol, sfxVol, ambientVol] = await Promise.all([
    getPref("audio.master"),
    getPref("audio.music"),
    getPref("audio.sfx"),
    getPref("audio.ambient"),
  ]);
  setMasterVolume(masterVol);
  setChannelVolume("music", musicVol);
  setChannelVolume("sfx", sfxVol);
  setChannelVolume("ambient", ambientVol);
  // Kick the meadow bed. The placeholder scene drops the player on a
  // single meadow chunk, so meadow is the truthful biome at boot.
  // Fire-and-forget — no need to gate scene readiness on the audio
  // load finishing.
  void setBiomeMusic("meadow").catch((error) => {
    // eslint-disable-next-line no-console
    console.warn("[grovekeeper] setBiomeMusic failed at boot", error);
  });

  // Hand off to JP's loader. This injects <jolly-loading> and starts
  // the main loop once GPU detection + asset autoload completes.
  await loadRuntime(runtime).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[grovekeeper] loadRuntime failed", error);
  });

  let disposed = false;

  return {
    runtime,
    pause() {
      if (!disposed && runtime.running) {
        runtime.stop();
      }
    },
    resume() {
      if (!disposed && !runtime.running) {
        runtime.start();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        runtime.stop();
      } catch {
        /* already stopped */
      }
      try {
        sceneSource.remove(ambient);
        sceneSource.remove(dir);
      } catch {
        /* scene already torn down */
      }
    },
  };
}
