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

  // Placeholder player Actor. Renders a green cube at world origin.
  // The Gardener GLB ModelRenderer replaces this in the asset wave.
  const playerActor = world.createActor("player");
  const playerBehavior = playerActor.addComponentAndGet(PlayerActor, {
    spawn: { x: 0, y: 0, z: 0 },
  });

  // Follow camera. Lerps to the player actor each tick.
  const cameraActor = world.createActor("camera");
  cameraActor.addComponentAndGet(CameraFollowBehavior, {
    player: playerBehavior,
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
