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
import { CHUNK_TUNING, SingleChunkActor } from "@/game/world";
import {
  InputManager,
  mountNipplejsAdapter,
  type NipplejsAdapterHandle,
} from "@/input";
import { CameraFollowBehavior } from "./CameraFollowBehavior";
import { PlayerActor, type PlayerBounds } from "./PlayerActor";
import playerConfig from "./player.config.json";

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
  /**
   * Force the on-screen virtual joystick on for desktop. Defaults to
   * false — `mountNipplejsAdapter` only enables itself on touchscreens.
   */
  forceJoystick?: boolean;
}

/**
 * Build a single-chunk player bounds box from `CHUNK_TUNING`. Wave 9
 * swaps this for streamed bounds; here it's just a container the
 * player can't walk out of.
 */
function singleChunkBounds(): PlayerBounds {
  const { size, groundY } = CHUNK_TUNING;
  return {
    minX: 0,
    maxX: size - 1,
    minZ: 0,
    maxZ: size - 1,
    groundY: groundY + 1, // top of the surface block
  };
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

  // Input — action-mapped wrapper over the engine's `world.input`.
  // The InputManager is a plain object; the engine doesn't know about
  // it. PlayerActor reads from it each frame.
  const inputManager = new InputManager({ input: world.input });

  // Joystick — mounted on the canvas's parent element so it overlays
  // the scene. nipplejs internally creates its own DOM nodes; on
  // desktop without forceJoystick this is a no-op.
  const joystickHost = canvas.parentElement ?? canvas;
  let joystickHandle: NipplejsAdapterHandle | null = null;
  try {
    joystickHandle = mountNipplejsAdapter({
      zone: joystickHost as HTMLElement,
      inputManager,
      forceEnable: options.forceJoystick ?? false,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[grovekeeper] joystick mount failed", error);
  }

  // Player Actor. Reads `move` from the InputManager each frame, walks
  // around the chunk, swaps Idle ↔ Walk on the Gardener GLTF.
  const playerActor = world.createActor("player");
  const playerBehavior = playerActor.addComponentAndGet(PlayerActor, {
    spawn: { x: 8, y: SingleChunkActor.SURFACE_Y + 1, z: 8 },
    inputManager,
    bounds: singleChunkBounds(),
  });

  // Follow camera. Lerps to the player actor each tick. Offset retuned
  // for the higher spawn so the chunk fills the frame nicely.
  const cameraActor = world.createActor("camera");
  cameraActor.addComponentAndGet(CameraFollowBehavior, {
    player: playerBehavior,
    offset: new THREE.Vector3(0, 8, 12),
    responsiveness: playerConfig.cameraResponsiveness,
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
        joystickHandle?.destroy();
      } catch {
        /* idempotent */
      }
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
