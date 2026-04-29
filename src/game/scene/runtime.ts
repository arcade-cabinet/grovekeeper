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
import {
  SCRIPTED_LINE_HISTORY_IDS,
  SCRIPTED_LINE_PHRASE_IDS,
} from "@/content/dialogue/scripted-spirit-lines";
import { getDbAsync } from "@/db/client";
import { getPref } from "@/db/preferences";
import {
  chunksRepo,
  dialogueRepo,
  inventoryRepo,
  recipesRepo,
  structuresRepo,
} from "@/db/repos";
import { claimGrove, getGroveById, lightHearth } from "@/db/repos/grovesRepo";
import { createWorld, getWorld } from "@/db/repos/worldsRepo";
import {
  anchorInFrontOfPlayer,
  commitPlacing,
  enterPlacing,
  IDLE_STATE,
} from "@/game/building/placeMode";
import { commitBlueprintPlacement } from "@/game/building/placement";
import type { PlaceModeState } from "@/game/building/types";
import { dispatchPlayerHit, swingHit } from "@/game/combat/combatSystem";
import { canSwing, spendSwingStamina } from "@/game/combat/swingStamina";
import { listAllRecipes } from "@/game/crafting";
import { pickScriptedSpiritLine } from "@/game/dialogue/dialogueSystem";
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
  STARTER_GROVE_CHUNK,
  seedStarterGrove,
} from "@/game/world";
import {
  InputManager,
  mountNipplejsAdapter,
  type NipplejsAdapterHandle,
} from "@/input";
import { koota, spawnPlayer } from "@/koota";
import { eventBus } from "@/runtime/eventBus";
import { staminaSystem } from "@/systems/stamina";
import { Build, FarmerState, IsPlayer } from "@/traits";
import { CameraFollowBehavior } from "./CameraFollowBehavior";
import { ClaimRitualSystem } from "./ClaimRitualSystem";
import { CraftingStationActor } from "./CraftingStationActor";
import { CraftingStationProximityBehavior } from "./CraftingStationProximityBehavior";
import {
  type PopulatedEncounters,
  populateEncounters,
} from "./EncounterPopulator";
import {
  type ClaimedGroveNode,
  FastTravelController,
  listClaimedGroves,
} from "./fastTravel";
import { type PopulatedGrove, populateGrove } from "./GrovePopulator";
import { type HearthCandidate, pickHearthPrompt } from "./HearthInteraction";
import { InteractionSystem } from "./InteractionSystem";
import { InteractionTickBehavior } from "./InteractionTickBehavior";
import npcConfig from "./npc.config.json";
import { PlayerActor } from "./PlayerActor";
import playerConfig from "./player.config.json";
import { RetreatSystem } from "./RetreatSystem";

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

  // Koota player entity — must exist before any system that reads
  // IsPlayer + FarmerState (combat, stamina). Idempotent within a
  // session since createRuntime is only called once.
  spawnPlayer();

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

  // Wave 14/15 — encounter registry. Non-grove chunks get creature
  // encounters populated here and torn down on despawn.
  const populatedEncountersMap = new Map<string, PopulatedEncounters>();

  const chunkHooks: ChunkManagerHooks = {
    onChunkSpawned: ({ chunkX, chunkZ, biome, actor }) => {
      const key = groveGlowKey(chunkX, chunkZ);

      // Non-grove chunks: populate creature encounters.
      if (biome !== "grove") {
        if (!populatedEncountersMap.has(key)) {
          let creatureIdx = 0;
          const handle = populateEncounters({
            worldSeed: RC_WORLD_SEED,
            chunkX,
            chunkZ,
            biome,
            surfaceY: ChunkActor.SURFACE_Y + 1,
            factory: {
              createActor: () =>
                world.createActor(
                  `creature-${chunkX}-${chunkZ}-${creatureIdx++}`,
                ),
            },
            onPlayerHit: (damage) => dispatchPlayerHit(koota, damage),
          });
          populatedEncountersMap.set(key, handle);
        }
        return;
      }

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
      const encounters = populatedEncountersMap.get(key);
      if (encounters) {
        encounters.dispose();
        populatedEncountersMap.delete(key);
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
  /**
   * Sub-wave D — read scripted-line eligibility flags from the DB so
   * the Spirit can fire line1/line2/line3 as the journey progresses.
   * Returns a snapshot suitable for `pickScriptedSpiritLine(...)`.
   * If the DB isn't up, every flag is false (no-op selector).
   */
  function readScriptedLineState() {
    if (!dbHandle) {
      return {
        starterAxeKnown: false,
        groveClaimed: false,
        scriptedLineFired: { line1: false, line2: false, line3: false },
      } as const;
    }
    let groveClaimed = false;
    try {
      const grove = getGroveById(
        dbHandle.db,
        `grove-${STARTER_GROVE_CHUNK.x}-${STARTER_GROVE_CHUNK.z}`,
      );
      groveClaimed = grove?.state === "claimed";
    } catch {
      /* DB shape skew — treat as unclaimed */
    }
    let starterAxeKnown = false;
    try {
      starterAxeKnown = recipesRepo.isKnown(
        dbHandle.db,
        RC_WORLD_ID,
        "recipe.starter-axe",
      );
    } catch {
      /* DB shape skew — treat as unlearned */
    }
    const fired = {
      line1: false,
      line2: false,
      line3: false,
    };
    for (const key of ["line1", "line2", "line3"] as const) {
      try {
        fired[key] =
          dialogueRepo.getLastPhrase(
            dbHandle.db,
            RC_WORLD_ID,
            SCRIPTED_LINE_HISTORY_IDS[key],
          ) !== null;
      } catch {
        /* ignore */
      }
    }
    return {
      starterAxeKnown,
      groveClaimed,
      scriptedLineFired: fired,
    };
  }

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
        // Wrap the Spirit's interact() so scripted lines (Sub-wave D)
        // can pre-empt the random pool. Each scripted line fires at
        // most once per save: the firing is recorded as a synthetic
        // npcId in `dialogue_history` so a repeat call falls through
        // to the random pool.
        const spirit = grove.spirit;
        const wrapped = {
          getId: () => spirit.getId(),
          get position() {
            return spirit.position;
          },
          // biome-ignore lint/suspicious/noExplicitAny: variadic ctx
          interact: (ctx?: any) => {
            const state = readScriptedLineState();
            const scripted = pickScriptedSpiritLine(state);
            if (scripted) {
              // Mark this scripted line as fired so the next interact
              // can advance to the next line.
              if (dbHandle) {
                try {
                  dialogueRepo.recordPhrase(
                    dbHandle.db,
                    RC_WORLD_ID,
                    SCRIPTED_LINE_HISTORY_IDS[scripted.line],
                    SCRIPTED_LINE_PHRASE_IDS[scripted.line],
                  );
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.warn(
                    "[grovekeeper] scripted-line history record failed",
                    err,
                  );
                }
              }
              return scripted.pick;
            }
            return spirit.interact(ctx);
          },
        };
        out.push(wrapped);
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
      eventBus.emitInventoryChanged();
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
    canSwing: () => canSwing(koota),
    consumeSwingStamina: () => spendSwingStamina(koota),
    animation: {
      playSwing: () => playerBehavior.playSwingClip(),
    },
    onSwing: () => {
      const allCreatures = [...populatedEncountersMap.values()].flatMap(
        (h) => h.creatures as import("./CreatureActor").CreatureActor[],
      );
      swingHit(
        {
          x: playerActor.object3D.position.x,
          z: playerActor.object3D.position.z,
        },
        allCreatures,
      );
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
  groveTickActor.addComponentAndGet(GroveTickBehavior, {
    groveGlows,
    discovery: groveDiscovery,
    playerPosition: playerActor.object3D.position,
  });
  // Stamina regen — 2/sec scaled by difficulty. Must run every frame
  // so the regen is smooth; `onTickDelta` receives milliseconds which
  // we convert to seconds before passing to `staminaSystem`.
  const staminaTickActor = world.createActor("stamina-tick");
  staminaTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () => {},
    onTickDelta: (deltaMs) => staminaSystem(deltaMs / 1000),
  });

  // Wave 13 — placement tick. Watches the `Build` koota world trait:
  // when `mode === true`, the player is holding a blueprint. On a
  // rising-edge `interact` press we anchor the blueprint one voxel in
  // front of the player, commit it to the chunk mesh + DB, consume the
  // inventory item, and clear build mode. Cancels on Escape (handled
  // by the hearthTick / interactionTick Escape → pause path; here we
  // just guard the interact path and let the player walk away).
  let placeModeState: PlaceModeState = IDLE_STATE;
  const placementTickActor = world.createActor("placement-tick");
  placementTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () => {
      const build = koota.get(Build);
      if (!build?.mode || !build.templateId) {
        // Sync local state machine with the koota trait.
        if (placeModeState.kind !== "idle") {
          placeModeState = IDLE_STATE;
        }
        return;
      }

      const blueprintId = build.templateId;
      const px = playerActor.object3D.position.x;
      const pz = playerActor.object3D.position.z;
      const yaw = playerActor.object3D.rotation?.y ?? 0;
      const anchor = anchorInFrontOfPlayer(
        { x: px, z: pz, yaw },
        ChunkActor.SURFACE_Y,
        1.5,
      );

      // Keep local state in sync with the current anchor + blueprint.
      placeModeState = enterPlacing(placeModeState, blueprintId, anchor);

      // Teach the player what to press.
      eventBus.emitInteractCue({ variant: "place", label: "Press E to place" });

      const button = inputManager.getActionState("interact");
      if (!button.pressed || !button.justPressed) return;

      // Commit the blueprint to the live mesh + DB.
      const cx = Math.floor(anchor.x / CHUNK_SIZE);
      const cz = Math.floor(anchor.z / CHUNK_SIZE);
      const biomeId = assignBiome(RC_WORLD_SEED, cx, cz);
      const setBlock = (
        pos: import("@/game/building/types").VoxelCoord,
        blockId: string,
      ): boolean => {
        const bcx = Math.floor(pos.x / CHUNK_SIZE);
        const bcz = Math.floor(pos.z / CHUNK_SIZE);
        const lx = pos.x - bcx * CHUNK_SIZE;
        const lz = pos.z - bcz * CHUNK_SIZE;
        // Write to in-memory mod overlay so blockAt sees it immediately.
        let mem = memoryMods.get(memoryKey(bcx, bcz));
        if (!mem) {
          mem = new Map();
          memoryMods.set(memoryKey(bcx, bcz), mem);
        }
        mem.set(voxelKey(lx, pos.y, lz), blockId);
        // Write to live chunk mesh.
        const chunk = chunkManager.getChunk(bcx, bcz);
        if (chunk) {
          chunk.setBlockLocal(lx, pos.y, lz, blockId);
        }
        return true;
      };

      if (!dbHandle) return;

      const result = commitBlueprintPlacement({
        db: dbHandle.db,
        worldId: RC_WORLD_ID,
        groveId: `grove-${cx}-${cz}`,
        blueprintId,
        anchor,
        chunkSize: CHUNK_SIZE,
        biome: biomeId,
        setBlock,
      });

      if (result.success) {
        placeModeState = commitPlacing(placeModeState);
        // Consume the blueprint from inventory.
        try {
          inventoryRepo.addItem(dbHandle.db, RC_WORLD_ID, blueprintId, -1);
          eventBus.emitInventoryChanged();
        } catch {
          // Silent — the block was placed regardless.
        }
        // Clear build mode on the koota world trait and interact cue.
        koota.set(Build, { mode: false, templateId: null });
        eventBus.emitInteractCue(null);
        playSound("ui.click");
      }
    },
  });

  // Threshold tick: rides on the same per-frame pump via a thin shim.
  const thresholdTickActor = world.createActor("threshold-tick");
  thresholdTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () =>
      thresholdSystem.update({
        x: playerActor.object3D.position.x,
        z: playerActor.object3D.position.z,
      }),
  });

  // Wave 14/15 — retreat system. Watches HP + stamina; on zero, fades
  // to black, teleports the player to the nearest claimed grove (or the
  // starter grove if none claimed), restores vitals to 50%, then fades
  // back. The `emitRetreatOpacity` bus signal drives <RetreatOverlay>.
  const retreatSystem = new RetreatSystem({
    vitals: {
      get() {
        const player = koota.queryFirst(IsPlayer, FarmerState);
        if (!player) return null;
        const fs = player.get(FarmerState);
        if (!fs) return null;
        return {
          hp: fs.hp,
          hpMax: fs.maxHp,
          stamina: fs.stamina,
          staminaMax: fs.maxStamina,
        };
      },
      restore(fraction) {
        const player = koota.queryFirst(IsPlayer, FarmerState);
        if (!player) return;
        const fs = player.get(FarmerState);
        if (!fs) return;
        player.set(FarmerState, {
          ...fs,
          hp: Math.round(fs.maxHp * fraction),
          stamina: Math.round(fs.maxStamina * fraction),
        });
      },
    },
    teleporter: {
      teleport(worldX, worldZ) {
        playerActor.object3D.position.set(
          worldX,
          ChunkActor.SURFACE_Y + 1,
          worldZ,
        );
      },
    },
    groves: {
      list() {
        if (!dbHandle) return [];
        try {
          return listClaimedGroves(dbHandle.db, RC_WORLD_ID).map((g) => ({
            groveId: g.groveId,
            worldX: g.worldX,
            worldZ: g.worldZ,
          }));
        } catch {
          return [];
        }
      },
    },
  });
  const retreatTickActor = world.createActor("retreat-tick");
  retreatTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () => {},
    onTickDelta: (deltaMs) => {
      const state = retreatSystem.update(deltaMs, {
        x: playerActor.object3D.position.x,
        z: playerActor.object3D.position.z,
      });
      eventBus.emitRetreatOpacity(state.overlayOpacity);
    },
  });

  // ── Sub-wave D — hearth interaction + claim ritual + fast travel ──
  //
  // Per-frame: scan the active starter grove for placed-but-unlit
  // hearths. If the player is within proximity, emit a hearth prompt
  // on the bus so `<HearthPrompt>` can render "Press E to light".
  // When `interact` fires while the prompt is "light" → start the
  // ClaimRitualSystem cinematic. When the prompt is "fast-travel"
  // → open `<FastTravelMenu>` via the bus.
  //
  // The lookup is gated on `dbHandle`: no DB ⇒ no hearth prompts.
  // STARTER_GROVE_CHUNK provides the world-space center to compute
  // the structure's position; placed structures persist (cx, cy, cz)
  // local-to-grove coordinates which we resolve to world-space here.
  const STARTER_GROVE_ID = `grove-${STARTER_GROVE_CHUNK.x}-${STARTER_GROVE_CHUNK.z}`;
  let activeClaimRitual: ClaimRitualSystem | null = null;

  function listHearthCandidates(): HearthCandidate[] {
    if (!dbHandle) return [];
    try {
      const rows = structuresRepo.listStructuresInGrove(
        dbHandle.db,
        STARTER_GROVE_ID,
      );
      const grove = getGroveById(dbHandle.db, STARTER_GROVE_ID);
      const lit = grove?.hearthLitAt != null;
      // The schema's structure type is the discriminator; "hearth"
      // matches the recipe template id.
      return rows
        .filter((r) => r.type === "hearth")
        .map((r) => ({
          structureId: r.id,
          groveId: STARTER_GROVE_ID,
          position: { x: r.x, y: r.y, z: r.z },
          lit,
        }));
    } catch {
      return [];
    }
  }

  function startClaimRitual(_structureId: string, groveId: string): void {
    if (activeClaimRitual?.isActive) return;
    activeClaimRitual = new ClaimRitualSystem({
      hooks: {
        setInputLocked: (locked) => eventBus.emitClaimCinematicActive(locked),
        playSound: (id) => playSound(id),
        playStinger: (id) => playSound(id),
        restoreBiomeMusic: () => {
          void setBiomeMusic("meadow").catch(() => {
            /* idempotent */
          });
        },
        setHearthEmissive: (_intensity: number) => {
          // @todo Wave D2: pulse the actual hearth mesh emissive.
          // For RC the cinematic's audio + spirit line are the
          // perceptual anchors; the visual ramp is a polish goal.
        },
        setVillagerAlpha: (_alpha: number) => {
          // @todo Wave D2: villagers fade in over the claim ritual's
          // settle phase. Currently they pop in at full alpha when
          // GrovePopulator's claimed-state check flips on next chunk
          // load.
        },
        persistClaim: () => {
          if (!dbHandle) return;
          try {
            claimGrove(dbHandle.db, groveId);
            lightHearth(dbHandle.db, groveId);
            // Mark this hearth structure as lit. The structuresRepo
            // schema doesn't expose a `lit` field at the row level —
            // the grove's `hearthLitAt` is the source of truth and
            // `pickHearthPrompt` reads it via `lit` on the candidate.
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[grovekeeper] persistClaim failed", err);
          }
          eventBus.emitGroveClaimed({ groveId, worldId: RC_WORLD_ID });
        },
        spawnVillagers: () => {
          // Re-populate the starter grove so villagers (1-4) appear
          // post-claim. Dispose the existing handle and rebuild.
          const key = groveGlowKey(
            STARTER_GROVE_CHUNK.x,
            STARTER_GROVE_CHUNK.z,
          );
          const existing = populatedGroves.get(key);
          existing?.dispose();
          populatedGroves.delete(key);
          // The next chunk re-population path runs through
          // `chunkHooks.onChunkSpawned`, which sees `groveState=claimed`
          // (read from DB) and spawns villagers. We trigger that by
          // calling populateGrove directly here against the current
          // chunk. Idempotent if villagers already there.
          const handle = populateGrove({
            worldSeed: RC_WORLD_SEED,
            chunkX: STARTER_GROVE_CHUNK.x,
            chunkZ: STARTER_GROVE_CHUNK.z,
            surfaceY: ChunkActor.SURFACE_Y + 1,
            factory: {
              createActor: () =>
                world.createActor(
                  `npc-${STARTER_GROVE_CHUNK.x}-${STARTER_GROVE_CHUNK.z}`,
                ),
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
            groveState: "claimed",
          });
          populatedGroves.set(key, handle);
        },
        emitSpiritLine: (_line: string) => {
          // The cinematic's `settle` beat speaks line2 itself —
          // record it as fired so the next interact advances to
          // line3 (recipe.starter-axe is now known post-claim).
          if (!dbHandle) return;
          try {
            dialogueRepo.recordPhrase(
              dbHandle.db,
              RC_WORLD_ID,
              SCRIPTED_LINE_HISTORY_IDS.line2,
              SCRIPTED_LINE_PHRASE_IDS.line2,
            );
          } catch {
            /* ignore */
          }
        },
      },
    });
    activeClaimRitual.start(performance.now());
  }

  // Fast-travel controller — owned by runtime. Teleporter snaps the
  // player actor's XZ; overlay drives the bus's fade signal so the
  // Solid `<FastTravelFade>` mounts a black scrim during the swap.
  const fastTravelController = new FastTravelController({
    teleporter: {
      teleport: (worldX, worldZ) => {
        playerActor.object3D.position.x = worldX;
        playerActor.object3D.position.z = worldZ;
      },
    },
    overlay: {
      setFadeOpacity: (opacity) => eventBus.emitFastTravelFadeOpacity(opacity),
    },
  });

  // Bridge: when `<FastTravelMenu>` emits a destination, look up the
  // node's coords and start the controller's transition. Closing the
  // menu happens on the UI side; we just kick the fade.
  eventBus.onFastTravelStart((ev) => {
    if (fastTravelController.isActive) return;
    if (!dbHandle) return;
    const claimed = listClaimedGroves(dbHandle.db, RC_WORLD_ID);
    const node: ClaimedGroveNode | undefined = claimed.find(
      (n) => n.groveId === ev.groveId,
    );
    if (!node) return;
    fastTravelController.start(node, performance.now());
  });

  // Sub-wave D — hearth proximity + interact tick. Runs every frame
  // alongside the threshold + interaction systems. Cheap when there
  // are no hearths placed (early game) — the structuresRepo lookup
  // returns an empty list and we early-exit.
  const hearthTickActor = world.createActor("hearth-tick");
  hearthTickActor.addComponentAndGet(InteractionTickBehavior, {
    onTick: () => {
      // Drive any active claim cinematic.
      if (activeClaimRitual?.isActive) {
        activeClaimRitual.tick(performance.now());
      }
      // Drive any active fast-travel transition.
      if (fastTravelController.isActive) {
        fastTravelController.tick(performance.now());
      }

      const candidates = listHearthCandidates();
      const px = playerActor.object3D.position.x;
      const pz = playerActor.object3D.position.z;
      const pick = pickHearthPrompt({ x: px, z: pz }, candidates);
      if (pick) {
        const cam = cameraFollow.getCamera();
        const screen = projectWorldToScreen(
          pick.candidate.position,
          cam,
          canvas,
        );
        eventBus.emitHearthPrompt({
          structureId: pick.candidate.structureId,
          groveId: pick.candidate.groveId,
          screenPosition: screen,
          variant: pick.variant,
        });
      } else {
        eventBus.emitHearthPrompt(null);
      }

      // Rising-edge interact press while a prompt is visible.
      // `getActionState("interact").justPressed` is stable across
      // multiple calls in the same frame (it's derived from
      // `buttonsHeldPrev` which only ticks at `endFrame()`), so this
      // is safe to read alongside InteractionSystem's call.
      const button = inputManager.getActionState("interact");
      const justPressed = button.pressed && button.justPressed;

      if (justPressed && pick && !activeClaimRitual?.isActive) {
        if (pick.variant === "light") {
          startClaimRitual(pick.candidate.structureId, pick.candidate.groveId);
          eventBus.emitHearthPrompt(null);
        } else if (pick.variant === "fast-travel") {
          eventBus.emitFastTravelOpen(true);
        }
      }
    },
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
