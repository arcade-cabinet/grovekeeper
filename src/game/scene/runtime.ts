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
import { getDbAsync } from "@/db/client";
import { getPref } from "@/db/preferences";
import { dialogueRepo } from "@/db/repos";
import { createWorld, getWorld } from "@/db/repos/worldsRepo";
import {
  applyGroveEmissivePulse,
  assignBiome,
  ChunkActor,
  ChunkManager,
  type ChunkManagerHooks,
  ChunkStreamerBehavior,
  createGroveDiscoverySystem,
  createGroveFireflies,
  disposeGroveGlow,
  type GroveGlowHandle,
  GroveTickBehavior,
  resolveStreamingConfig,
} from "@/game/world";
import {
  InputManager,
  mountNipplejsAdapter,
  type NipplejsAdapterHandle,
} from "@/input";
import { CameraFollowBehavior } from "./CameraFollowBehavior";
import { type PopulatedGrove, populateGrove } from "./GrovePopulator";
import { InteractionSystem } from "./InteractionSystem";
import { InteractionTickBehavior } from "./InteractionTickBehavior";
import { PlayerActor } from "./PlayerActor";
import playerConfig from "./player.config.json";

/** Hardcoded RC world id — Wave 10 single-world. Journey wave wires real selection. */
const RC_WORLD_ID = "rc-world-default";
/** Hardcoded RC world seed — Wave 10. Same as ChunkManager. */
const RC_WORLD_SEED = 0;

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
  // freely across an infinite chunk grid (no XZ bounds — Wave 9 removed
  // the single-chunk clamp). Y is held to the shared surface for now;
  // proper voxel collision is a future wave.
  const playerActor = world.createActor("player");
  const playerBehavior = playerActor.addComponentAndGet(PlayerActor, {
    spawn: { x: 8, y: ChunkActor.SURFACE_Y + 1, z: 8 },
    inputManager,
    surfaceY: ChunkActor.SURFACE_Y + 1,
  });

  // Wave 10 — DB handle + ensure-world. Grove discovery writes go here.
  // We swallow DB-init failures so a broken IndexedDB layer doesn't
  // block scene boot; discovery just becomes a no-op in that case.
  let dbHandle: Awaited<ReturnType<typeof getDbAsync>> | null = null;
  try {
    dbHandle = await getDbAsync();
    if (!getWorld(dbHandle.db, RC_WORLD_ID)) {
      createWorld(dbHandle.db, {
        id: RC_WORLD_ID,
        name: "Grovekeeper",
        gardenerName: "Gardener",
        worldSeed: String(RC_WORLD_SEED),
        difficulty: "sapling",
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "[grovekeeper] DB init failed; grove discovery disabled",
      error,
    );
  }

  // Wave 10 — grove glow registry. Keyed by `chunkX,chunkZ` so the
  // per-frame updater can iterate a flat list. Populated on
  // `onChunkSpawned` for grove biome chunks; torn down on
  // `onChunkDespawned` so off-screen groves don't leak buffers.
  const groveGlows = new Map<string, GroveGlowHandle>();
  const groveGlowKey = (cx: number, cz: number) => `${cx},${cz}`;

  // Wave 11b — populated-grove registry. Mirror of the glow map: each
  // grove chunk's NPCs (1 Spirit + 1-4 villagers) are spawned on
  // `onChunkSpawned` and disposed on `onChunkDespawned`. Population is
  // deterministic in `(worldSeed, chunkX, chunkZ)`.
  const populatedGroves = new Map<string, PopulatedGrove>();

  const chunkHooks: ChunkManagerHooks = {
    onChunkSpawned: ({ chunkX, chunkZ, biome, actor }) => {
      if (biome !== "grove") return;
      const key = groveGlowKey(chunkX, chunkZ);
      // Wait for the chunk's mesh to land before traversing it; the
      // load is async, so a sync traversal here would find an empty
      // subtree.
      void actor.whenLoaded().then(() => {
        const root = actor.object3D;
        if (!root || groveGlows.has(key)) return;
        const { materials, originalEmissive } = applyGroveEmissivePulse(root);
        const fireflies = createGroveFireflies({
          chunkSize: 16,
          surfaceY: ChunkActor.SURFACE_Y,
          worldSeed: RC_WORLD_SEED,
          chunkX,
          chunkZ,
        });
        root.add(fireflies.points);
        groveGlows.set(key, {
          materials,
          originalEmissive,
          fireflies: fireflies.points,
          fireflyBaseY: fireflies.baseY,
          fireflyPhase: fireflies.phase,
        });
      });

      // Wave 11b — spawn NPCs once the chunk is loaded. Population is
      // deterministic, so we don't need to wait for the mesh — the
      // actors live in their own subtree above the voxel chunk.
      // Wave 13 will gate villager spawn on the grove's `claimed`
      // state; for RC we always populate (see GrovePopulator notes).
      if (!populatedGroves.has(key)) {
        const handle = populateGrove({
          worldSeed: RC_WORLD_SEED,
          chunkX,
          chunkZ,
          surfaceY: ChunkActor.SURFACE_Y + 1,
          factory: {
            createActor: () => world.createActor(`npc-${chunkX}-${chunkZ}`),
          },
          history: dbHandle
            ? {
                getLastPhraseId: (npcId) =>
                  dialogueRepo.getLastPhrase(dbHandle.db, RC_WORLD_ID, npcId)
                    ?.lastPhraseId ?? null,
                hasMet: (npcId) =>
                  dialogueRepo.getLastPhrase(
                    dbHandle.db,
                    RC_WORLD_ID,
                    npcId,
                  ) !== null,
              }
            : undefined,
        });
        populatedGroves.set(key, handle);
      }
    },
    onChunkDespawned: ({ chunkX, chunkZ }) => {
      const key = groveGlowKey(chunkX, chunkZ);
      const handle = groveGlows.get(key);
      if (handle) {
        disposeGroveGlow(handle);
        groveGlows.delete(key);
      }
      const grove = populatedGroves.get(key);
      if (grove) {
        grove.dispose();
        populatedGroves.delete(key);
      }
    },
  };

  // Wave 9 — chunk streaming. The manager is a POJO + a behavior shim
  // that pumps it once per frame. It owns a Map<chunkKey, ChunkActor>
  // and spawns/despawns chunks as the player walks. Biome per chunk
  // comes from `assignBiome(seed, x, z)`, deterministic for any seed.
  // Today the world seed is a hardcoded 0 — Wave 4's preferences slot
  // will feed in a player-chosen seed once world selection lands.
  const chunkManager = new ChunkManager({
    world,
    playerPosition: playerActor.object3D.position,
    worldSeed: RC_WORLD_SEED,
    streaming: resolveStreamingConfig(),
    hooks: chunkHooks,
  });
  const streamerActor = world.createActor("chunk-streamer");
  streamerActor.addComponentAndGet(ChunkStreamerBehavior, {
    manager: chunkManager,
  });

  // Wave 10 — grove discovery system. Rides the per-frame loop via
  // a thin behavior shim so `update(playerPos)` is called every tick.
  // When the DB never initialized we skip mounting the system —
  // discovery becomes a silent no-op rather than crashing the scene.
  const groveDiscovery = dbHandle
    ? createGroveDiscoverySystem({
        db: dbHandle.db,
        worldId: RC_WORLD_ID,
        worldSeed: RC_WORLD_SEED,
        chunkSize: 16,
        resolveSurroundingBiome: (cx, cz) => assignBiome(RC_WORLD_SEED, cx, cz),
      })
    : null;

  // Wave 11b — interaction system. Polls the `interact` action's rising
  // edge each frame; when fired, finds the nearest NPC across all
  // populated groves and surfaces the next phrase via `onPhrase`. The
  // active speech bubble lives on a closure-local field (a future UI
  // wave will replace this with a Solid signal so `<NpcSpeechBubble>`
  // can subscribe). Persistence to `dialogue_history` happens here so
  // the next session's repeat-avoidance filter is primed.
  const interactionSystem = new InteractionSystem({
    player: playerBehavior,
    input: inputManager,
    getNpcs: () => {
      const out: Array<{
        getId(): string;
        position: { x: number; y: number; z: number };
        // biome-ignore lint/suspicious/noExplicitAny: actor.interact is fully typed at the source
        interact: any;
      }> = [];
      for (const grove of populatedGroves.values()) {
        out.push(grove.spirit);
        for (const v of grove.villagers) out.push(v);
      }
      return out;
    },
    onPhrase: (event) => {
      if (dbHandle) {
        try {
          dialogueRepo.recordPhrase(
            dbHandle.db,
            RC_WORLD_ID,
            event.npcId,
            event.pick.id,
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("[grovekeeper] dialogueRepo.recordPhrase failed", error);
        }
      }
      // Surface to the console for now — a follow-up wave plumbs the
      // event into a Solid signal so the SpeechBubble UI can render it.
      // eslint-disable-next-line no-console
      console.info(
        `[grovekeeper] ${event.npcId}: ${event.pick.text} [${event.pick.tag}]`,
      );
    },
  });
  const interactionTickActor = world.createActor("interaction-tick");
  interactionTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () => interactionSystem.tick(),
  });

  // Per-frame tick driver for grove visuals + discovery. Uses a
  // dedicated ActorComponent so the engine ticks it like any other
  // behavior in the actor graph.
  const groveTickActor = world.createActor("grove-tick");
  groveTickActor.addComponentAndGet(GroveTickBehavior, {
    groveGlows,
    discovery: groveDiscovery,
    playerPosition: playerActor.object3D.position,
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
        chunkManager.dispose();
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
