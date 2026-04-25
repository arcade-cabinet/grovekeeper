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
  playSound,
  setBiomeMusic,
  setChannelVolume,
  setMasterVolume,
} from "@/audio";
import { getDbAsync } from "@/db/client";
import { getPref } from "@/db/preferences";
import {
  chunksRepo,
  dialogueRepo,
  inventoryRepo,
  recipesRepo,
} from "@/db/repos";
import { createWorld, getWorld } from "@/db/repos/worldsRepo";
import { listAllRecipes } from "@/game/crafting";
import {
  applyInventoryCap,
  GatherSystem,
  GatherTickBehavior,
} from "@/game/gathering";
import {
  applyGroveEmissivePulse,
  assignBiome,
  ChunkActor,
  ChunkManager,
  type ChunkManagerHooks,
  ChunkStreamerBehavior,
  createGroveDiscoverySystem,
  createGroveFireflies,
  createThresholdSystem,
  disposeGroveGlow,
  type GroveGlowHandle,
  GroveTickBehavior,
  getBiome,
  isStarterGroveSeeded,
  resolveStreamingConfig,
  seedStarterGrove,
  STARTER_GROVE_CHUNK,
} from "@/game/world";
import {
  InputManager,
  mountNipplejsAdapter,
  type NipplejsAdapterHandle,
} from "@/input";
import { eventBus } from "@/runtime/eventBus";
import { CameraFollowBehavior } from "./CameraFollowBehavior";
import { CraftingStationActor } from "./CraftingStationActor";
import { CraftingStationProximityBehavior } from "./CraftingStationProximityBehavior";
import { type PopulatedGrove, populateGrove } from "./GrovePopulator";
import { InteractionSystem } from "./InteractionSystem";
import { InteractionTickBehavior } from "./InteractionTickBehavior";
import npcConfig from "./npc.config.json";
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
  // Sub-wave C — spawn the player at the centre of the starter grove
  // chunk (3, 0). Chunk world origin is `(3 * 16, _, 0 * 16)`; centre
  // is half a chunk inside.
  const STARTER_CHUNK_SIZE = 16;
  const playerSpawnX =
    STARTER_GROVE_CHUNK.x * STARTER_CHUNK_SIZE + STARTER_CHUNK_SIZE / 2;
  const playerSpawnZ =
    STARTER_GROVE_CHUNK.z * STARTER_CHUNK_SIZE + STARTER_CHUNK_SIZE / 2;
  const playerActor = world.createActor("player");
  const playerBehavior = playerActor.addComponentAndGet(PlayerActor, {
    spawn: {
      x: playerSpawnX,
      y: ChunkActor.SURFACE_Y + 1,
      z: playerSpawnZ,
    },
    inputManager,
    surfaceY: ChunkActor.SURFACE_Y + 1,
  });

  // Wave 10 — DB handle + ensure-world. Grove discovery writes go here.
  // We swallow DB-init failures so a broken IndexedDB layer doesn't
  // block scene boot; discovery just becomes a no-op in that case.
  let dbHandle: Awaited<ReturnType<typeof getDbAsync>> | null = null;
  try {
    dbHandle = await getDbAsync();
    const isFreshWorld = !getWorld(dbHandle.db, RC_WORLD_ID);
    if (isFreshWorld) {
      createWorld(dbHandle.db, {
        id: RC_WORLD_ID,
        name: "Grovekeeper",
        gardenerName: "Gardener",
        worldSeed: String(RC_WORLD_SEED),
        difficulty: "sapling",
      });
    }
    // Seed starter inventory + unlock all recipes so a fresh boot can
    // immediately walk to the workbench and craft. Idempotent under
    // re-seed but we gate to first-create to avoid topping up logs every
    // session — a future wave (real persistence flow) will own this.
    if (isFreshWorld) {
      seedStarterRunState(dbHandle.db, RC_WORLD_ID);
    }
    // Sub-wave C — starter grove pre-state. Idempotent: re-runs are
    // free, so we always call it. Existing saves that were created
    // before this code landed will get the seed on first boot via the
    // `discoverGrove` short-circuit (which is also idempotent).
    if (!isStarterGroveSeeded(dbHandle.db, RC_WORLD_ID)) {
      seedStarterGrove(dbHandle.db, RC_WORLD_ID);
    }
    // Sub-wave C — recipe-gating: when sub-wave A's claim system
    // emits `groveClaimed`, learn `recipe.starter-axe`. We register
    // here (not inside the claim system) so this hook lives next to
    // the persistence layer it touches. `learnRecipe` is idempotent.
    eventBus.onGroveClaimed((ev) => {
      if (!dbHandle) return;
      try {
        recipesRepo.learnRecipe(dbHandle.db, ev.worldId, "recipe.starter-axe");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          "[grovekeeper] starter-axe recipe-gate hook failed",
          error,
        );
      }
    });
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

  // Follow camera. Lerps to the player actor each tick. Offset retuned
  // for the higher spawn so the chunk fills the frame nicely. Mounted
  // before the InteractionSystem so the speech-bubble world→screen
  // projection has access to the camera matrices.
  const cameraActor = world.createActor("camera");
  const cameraFollow = cameraActor.addComponentAndGet(CameraFollowBehavior, {
    player: playerBehavior,
    offset: new THREE.Vector3(0, 8, 12),
    responsiveness: playerConfig.cameraResponsiveness,
  });

  // Wave 13 — UI Glue: spawn one CraftingStationActor at world (10, 6, 8)
  // so the player can find a workbench from spawn. The station is
  // freestanding (not tied to a chunk) — it uses absolute world
  // coordinates and does not despawn with chunks. Wave 18 (journey
  // wave) will move this into the starter grove and persist its
  // position; for RC we just need *one* visible bench.
  const workbenchActor = world.createActor("primitive-workbench");
  const workbench = workbenchActor.addComponentAndGet(CraftingStationActor, {
    stationId: "primitive-workbench",
    position: { x: 10, y: ChunkActor.SURFACE_Y + 1, z: 8 },
  });
  const craftingStations: CraftingStationActor[] = [workbench];
  const proximityActor = world.createActor("crafting-proximity");
  proximityActor.addComponentAndGet(CraftingStationProximityBehavior, {
    getStations: () => craftingStations,
    getPlayerPosition: () => ({
      x: playerBehavior.position.x,
      z: playerBehavior.position.z,
    }),
    input: inputManager,
  });

  // Wave 11b — interaction system. Polls the `interact` action's rising
  // edge each frame; when fired, finds the nearest NPC across all
  // populated groves and surfaces the next phrase via `onPhrase`. UI
  // glue: `onPhrase` projects the NPC's world position through the
  // camera and emits an `NpcSpeechEvent` on the `eventBus` for the
  // Solid `<NpcSpeechBubble>` to consume. Persistence to
  // `dialogue_history` happens here so the next session's
  // repeat-avoidance filter is primed.
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
      // Project the NPC's world position to canvas-relative CSS px so
      // the Solid `<NpcSpeechBubble>` can anchor at the NPC's head.
      // Falls back to canvas centre if projection fails (e.g. NPC
      // behind the camera) — better than dropping the phrase entirely.
      const cam = cameraFollow.getCamera();
      const screen = projectWorldToScreen(event.position, cam, canvas);
      eventBus.emitNpcSpeech({
        speakerId: event.npcId,
        phrase: event.pick.text,
        screenPosition: screen,
        ttlMs: npcConfig.interaction.bubbleHoldSeconds * 1000,
      });
    },
  });
  const interactionTickActor = world.createActor("interaction-tick");
  interactionTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () => interactionSystem.tick(),
  });

  // Wave 16 — gathering. The player presses `swing` (Space / mobile
  // swing button) facing a voxel; the system increments a hit counter
  // until the block breaks, then drops materials into `inventoryRepo`
  // and persists the removal via `chunksRepo.applyBlockMod`. Grove
  // biome voxels are unbreakable per spec.
  //
  // Three closures plumb the system to the world:
  //   - `blockAt`      — resolves the biome surface block name at a
  //     world voxel, accounting for any persisted `chunksRepo` mods.
  //   - `removeBlock`  — writes the "remove" mod through both the live
  //     `ChunkActor` mesh AND `chunksRepo`, so the change survives
  //     reload.
  //   - `addInventory` — applies the cozy-tier carry cap, then
  //     forwards to `inventoryRepo.addItem`.
  // Each closure handles a missing DB handle (early-game, before
  // `getDbAsync` resolved) by falling back to a memory-only path so
  // the player still sees blocks disappear.
  const memoryMods = new Map<
    string, // chunkX,chunkZ
    Map<string, string> // localX,y,localZ -> blockId or "__air__"
  >();
  const memoryKey = (cx: number, cz: number) => `${cx},${cz}`;
  const voxelKey = (lx: number, y: number, lz: number) => `${lx},${y},${lz}`;
  const CHUNK_SIZE = 16;
  const GROUND_Y = ChunkActor.SURFACE_Y - 1;

  function blockAt(x: number, y: number, z: number): string | null {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;

    // 1. In-memory mod overlay (Wave 16 break tracking, plus any
    //    placement Wave 12 stamped without a DB write).
    const mem = memoryMods.get(memoryKey(cx, cz));
    const memHit = mem?.get(voxelKey(lx, y, lz));
    if (memHit === "__air__") return null;
    if (memHit) return memHit;

    // 2. Persisted mods (Wave 12 placements, prior Wave 16 breaks).
    if (dbHandle) {
      const mods = chunksRepo.getModifiedBlocks(
        dbHandle.db,
        RC_WORLD_ID,
        cx,
        cz,
      );
      for (const m of mods) {
        if (m.x === lx && m.y === y && m.z === lz) {
          if (m.op === "remove") return null;
          return m.blockId ?? null;
        }
      }
    }

    // 3. Procgen surface — only the surface row is gatherable for now;
    //    deeper digs (sub-surface dirt, bedrock) need vertical
    //    targeting which is a future wave.
    if (y !== GROUND_Y) return null;
    const biomeId = assignBiome(RC_WORLD_SEED, cx, cz);
    const biome = getBiome(biomeId);
    return biome.blocks.find((b) => b.id === biome.surfaceBlock)?.name ?? null;
  }

  function removeBlock(x: number, y: number, z: number): boolean {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;

    // Persist (best-effort).
    if (dbHandle) {
      const biomeId = assignBiome(RC_WORLD_SEED, cx, cz);
      try {
        chunksRepo.applyBlockMod(dbHandle.db, RC_WORLD_ID, cx, cz, biomeId, {
          x: lx,
          y,
          z: lz,
          op: "remove",
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          "[grovekeeper] chunksRepo.applyBlockMod(remove) failed",
          error,
        );
      }
    }

    // In-memory cache so subsequent `blockAt` lookups see the air.
    let mem = memoryMods.get(memoryKey(cx, cz));
    if (!mem) {
      mem = new Map();
      memoryMods.set(memoryKey(cx, cz), mem);
    }
    mem.set(voxelKey(lx, y, lz), "__air__");

    // Live mesh.
    const chunk = chunkManager.getChunk(cx, cz);
    if (chunk) {
      chunk.applyMod({ localX: lx, y, localZ: lz, op: "remove" });
    }
    return true;
  }

  function addInventory(
    itemId: string,
    count: number,
  ): {
    accepted: number;
    capped: boolean;
  } {
    if (!dbHandle) {
      // No DB — accept everything, no cap (degraded mode).
      return { accepted: count, capped: false };
    }
    const rows = inventoryRepo.listItems(dbHandle.db, RC_WORLD_ID);
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.itemId] = r.count;
    const result = applyInventoryCap(itemId, count, { currentCounts: counts });
    if (result.accepted > 0) {
      inventoryRepo.addItem(dbHandle.db, RC_WORLD_ID, itemId, result.accepted);
    }
    return result;
  }

  const gatherSystem = new GatherSystem({
    player: {
      get position() {
        return playerActor.object3D.position;
      },
      get facingYaw() {
        return playerActor.object3D.rotation?.y ?? 0;
      },
    },
    input: inputManager,
    blockAt,
    removeBlock,
    addInventory,
    audio: {
      swingHit: () => playSound("tool.axe.swing"),
      break_: () => playSound("tool.axe.break"),
      inventoryAdd: () => playSound("ui.inventory.add"),
      inventoryFull: () => playSound("ui.inventory.full"),
    },
    animation: {
      playSwing: () => playerBehavior.playSwingClip(),
    },
  });
  const gatherTickActor = world.createActor("gather-tick");
  gatherTickActor.addComponentAndGet(GatherTickBehavior, {
    onTick: () => gatherSystem.tick(),
  });

  // Sub-wave C — threshold chime system. Plays a soft chime when the
  // player crosses a grove ↔ non-grove chunk boundary. Aliased to
  // `ui.click` per spec — when a bespoke chime is curated this swaps
  // to `ui.threshold.chime`. Debounced 5s per boundary pair.
  const thresholdSystem = createThresholdSystem({
    worldSeed: RC_WORLD_SEED,
    chunkSize: 16,
    playChime: () => playSound("ui.click"),
  });

  // Per-frame tick driver for grove visuals + discovery + threshold.
  // Uses a dedicated ActorComponent so the engine ticks it like any
  // other behavior in the actor graph.
  const groveTickActor = world.createActor("grove-tick");
  const _baseGroveTickInstance = groveTickActor.addComponentAndGet(
    GroveTickBehavior,
    {
      groveGlows,
      discovery: groveDiscovery,
      playerPosition: playerActor.object3D.position,
    },
  );
  void _baseGroveTickInstance;
  // Threshold tick: rides on the same per-frame pump via a thin shim.
  const thresholdTickActor = world.createActor("threshold-tick");
  thresholdTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () =>
      thresholdSystem.update({
        x: playerActor.object3D.position.x,
        z: playerActor.object3D.position.z,
      }),
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

/**
 * Project a THREE world-space point through `camera` and return CSS
 * pixel coordinates relative to the canvas. The result anchors a DOM
 * overlay (e.g. `<NpcSpeechBubble>`) to a 3D position.
 *
 * If the point is behind the camera the projection clamps to the
 * canvas centre — the speech bubble is still visible, just not glued
 * to the speaker. Better than dropping the phrase entirely.
 */
function projectWorldToScreen(
  world: { x: number; y: number; z: number },
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const v = new THREE.Vector3(world.x, world.y, world.z);
  v.project(camera);
  // After project: v.z > 1 means behind near plane; just clamp to centre.
  if (v.z > 1 || !Number.isFinite(v.x) || !Number.isFinite(v.y)) {
    return { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
  }
  return {
    x: ((v.x + 1) / 2) * canvas.clientWidth,
    y: ((1 - v.y) / 2) * canvas.clientHeight,
  };
}

/**
 * Idempotently seed starter inventory + unlock all primitive-workbench
 * recipes. Called once on first world create — the player needs raw
 * materials and the recipe book to actually craft on a fresh boot.
 *
 * Items: 6 logs + 6 stones (covers the hearth, starter axe, and a
 * fence + a planks craft with margin to spare). Recipes: every recipe
 * in `listAllRecipes()` is learned. The crafting layer's recipe filter
 * still gates by station, so this doesn't mean every recipe is visible
 * at the workbench — it means *no* recipe is locked behind discovery
 * for RC. A future progression wave will gate this.
 */
function seedStarterRunState(
  // biome-ignore lint/suspicious/noExplicitAny: AppDatabase is internal
  db: any,
  worldId: string,
): void {
  inventoryRepo.addItem(db, worldId, "material.log", 6);
  inventoryRepo.addItem(db, worldId, "material.stone", 6);
  for (const recipe of listAllRecipes()) {
    recipesRepo.learnRecipe(db, worldId, recipe.id);
  }
}
