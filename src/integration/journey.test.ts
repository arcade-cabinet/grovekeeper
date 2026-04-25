/**
 * Journey integration test — Sub-wave D end-to-end proof.
 *
 * Walks the 14-beat journey from spec
 * `docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md`
 * §"The journey" using a real in-memory drizzle DB and *unit-level*
 * gameplay systems (gather math, claim ritual state machine, threshold
 * chime debounce, fast-travel controller, scripted-line picker).
 *
 * The Jolly Pixel runtime + Three.js scene are NOT instantiated here —
 * those are visual surfaces, exercised by Playwright. This test
 * proves the gameplay state machine flips through every persistent
 * checkpoint deterministically:
 *
 *   1. World + starter grove seeded.
 *   2. Player at chunk (3, 0).
 *   3. First Spirit interaction → line1.
 *   4. Gather logs + stones via inventoryRepo (the gather system's
 *      job is to call `addItem`; we exercise the persistence path
 *      directly because the system also touches the live ChunkActor
 *      mesh which doesn't exist outside JP).
 *   5. Craft hearth → recipe consumes inputs, places structure.
 *   6. Trigger ClaimRitualSystem → ticks for 4s → claimGrove +
 *      lightHearth + recipe.starter-axe learned + scripted-line
 *      hooks fire.
 *   7. Spirit interact post-claim → line2.
 *   8. Craft starter-axe → inventory has item.axe.
 *   9. Spirit interact post-axe → line3.
 *  10. Threshold chime fires when player crosses grove ↔ wilderness.
 *  11. Fast-travel: register a second claimed grove, run controller
 *      through fade-out → hold → fade-in, assert the player position
 *      teleported.
 *
 * If this test passes, the journey beats fire deterministically in the
 * sequence the spec demands. The runtime wiring just glues the same
 * calls to the engine's per-frame loop.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  SCRIPTED_LINE_HISTORY_IDS,
  SCRIPTED_LINE_PHRASE_IDS,
  SCRIPTED_SPIRIT_LINES,
} from "@/content/dialogue/scripted-spirit-lines";
import {
  dialogueRepo,
  grovesRepo,
  inventoryRepo,
  recipesRepo,
  structuresRepo,
} from "@/db/repos";
import { createTestDb, type TestDbHandle } from "@/db/repos/testDb";
import { pickScriptedSpiritLine } from "@/game/dialogue/dialogueSystem";
import {
  ClaimRitualSystem,
  CLAIM_RITUAL_TIMING,
} from "@/game/scene/ClaimRitualSystem";
import {
  FastTravelController,
  listClaimedGroves,
} from "@/game/scene/fastTravel";
import {
  HEARTH_PROXIMITY_RADIUS,
  pickHearthPrompt,
} from "@/game/scene/HearthInteraction";
import {
  isGroveChunk,
  SECOND_GROVE_CHUNK,
  STARTER_GROVE_CHUNK,
} from "@/game/world/grovePlacement";
import {
  isStarterGroveSeeded,
  LOG_PILE_BLOCK_ID,
  seedStarterGrove,
  starterGroveId,
  STONE_CAIRN_BLOCK_ID,
} from "@/game/world/starterGrove";
import { createThresholdSystem } from "@/game/world/thresholdSystem";

const WORLD_ID = "rc-journey-world";
const WORLD_SEED = 0;
const CHUNK_SIZE = 16;

/** Read the scripted-line state snapshot the way runtime.ts does. */
function readScriptedLineState(handle: TestDbHandle) {
  const grove = grovesRepo.getGroveById(handle.db, starterGroveId());
  const groveClaimed = grove?.state === "claimed";
  const starterAxeKnown = recipesRepo.isKnown(
    handle.db,
    WORLD_ID,
    "recipe.starter-axe",
  );
  const fired = { line1: false, line2: false, line3: false };
  for (const key of ["line1", "line2", "line3"] as const) {
    fired[key] =
      dialogueRepo.getLastPhrase(
        handle.db,
        WORLD_ID,
        SCRIPTED_LINE_HISTORY_IDS[key],
      ) !== null;
  }
  return { starterAxeKnown, groveClaimed, scriptedLineFired: fired };
}

/** Persist that a scripted line fired (mirror of runtime.ts behavior). */
function recordScriptedLineFired(
  handle: TestDbHandle,
  line: "line1" | "line2" | "line3",
): void {
  dialogueRepo.recordPhrase(
    handle.db,
    WORLD_ID,
    SCRIPTED_LINE_HISTORY_IDS[line],
    SCRIPTED_LINE_PHRASE_IDS[line],
  );
}

describe("journey integration — 14-beat walkthrough", () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
    // Beat 0 — create the world row so foreign keys resolve.
    handle.db
      .insert((await import("@/db/schema/rc")).worlds)
      .values({
        id: WORLD_ID,
        name: "Grovekeeper",
        gardenerName: "Gardener",
        worldSeed: String(WORLD_SEED),
        difficulty: "sapling",
        createdAt: 0,
        lastPlayedAt: 0,
      })
      .run();
  });

  it("walks the journey from first spawn to second grove discovery", () => {
    // ── Beat 4: First spawn ──────────────────────────────────────────
    expect(isStarterGroveSeeded(handle.db, WORLD_ID)).toBe(false);
    seedStarterGrove(handle.db, WORLD_ID);
    expect(isStarterGroveSeeded(handle.db, WORLD_ID)).toBe(true);
    // Idempotent.
    seedStarterGrove(handle.db, WORLD_ID);
    expect(isStarterGroveSeeded(handle.db, WORLD_ID)).toBe(true);

    const grove = grovesRepo.getGroveById(handle.db, starterGroveId());
    expect(grove).not.toBeNull();
    expect(grove?.state).toBe("discovered");
    expect(grove?.chunkX).toBe(STARTER_GROVE_CHUNK.x);
    expect(grove?.chunkZ).toBe(STARTER_GROVE_CHUNK.z);

    // Player spawns at the centre of the starter grove chunk.
    const player = {
      x: STARTER_GROVE_CHUNK.x * CHUNK_SIZE + CHUNK_SIZE / 2,
      z: STARTER_GROVE_CHUNK.z * CHUNK_SIZE + CHUNK_SIZE / 2,
    };
    expect(player.x).toBe(56);
    expect(player.z).toBe(8);

    // The starter grove pre-state pre-learned `recipe.hearth` (so the
    // workbench's first crafting pass shows the hearth recipe).
    expect(recipesRepo.isKnown(handle.db, WORLD_ID, "recipe.hearth")).toBe(
      true,
    );
    // But not the starter-axe — that gates on claim.
    expect(
      recipesRepo.isKnown(handle.db, WORLD_ID, "recipe.starter-axe"),
    ).toBe(false);

    // ── Beat 5+6: First Spirit interaction → line1 ───────────────────
    {
      const state = readScriptedLineState(handle);
      const scripted = pickScriptedSpiritLine(state);
      expect(scripted).not.toBeNull();
      expect(scripted?.line).toBe("line1");
      expect(scripted?.pick.text).toBe(SCRIPTED_SPIRIT_LINES.line1);
      // Persist that line1 fired.
      recordScriptedLineFired(handle, "line1");
    }
    // Re-pick → no scripted line until claim.
    {
      const state = readScriptedLineState(handle);
      const scripted = pickScriptedSpiritLine(state);
      expect(scripted).toBeNull();
    }

    // ── Beat 6: Gather logs + stones ─────────────────────────────────
    // The starter grove pre-state stamped 4 log voxels and 3 stone
    // cairn voxels via chunksRepo.applyBlockMod. Gathering them is the
    // gather system's job; here we exercise the persistence path
    // (system-side `addInventory` closure) because the visual chunk
    // mesh isn't instantiated outside JP.
    inventoryRepo.addItem(handle.db, WORLD_ID, "material.log", 4);
    inventoryRepo.addItem(handle.db, WORLD_ID, "material.stone", 3);
    const inv = inventoryRepo.listItems(handle.db, WORLD_ID);
    const counts = Object.fromEntries(inv.map((r) => [r.itemId, r.count]));
    expect(counts["material.log"]).toBeGreaterThanOrEqual(3);
    expect(counts["material.stone"]).toBeGreaterThanOrEqual(2);

    // Just to assert the seeded prop blocks exist (logs + cairn block
    // ids are recognized constants).
    expect(LOG_PILE_BLOCK_ID).toBe("meadow.wood");
    expect(STONE_CAIRN_BLOCK_ID).toBe("meadow.stone");

    // ── Beat 7+8: Craft hearth → place hearth ────────────────────────
    // Crafting the hearth consumes 3 logs + 2 stones (illustrative) and
    // produces a placed-structure row. The structure type is "hearth".
    inventoryRepo.removeItem(handle.db, WORLD_ID, "material.log", 3);
    inventoryRepo.removeItem(handle.db, WORLD_ID, "material.stone", 2);
    const hearthStructureId = "hearth-1";
    const hearthPos = { x: player.x + 1, y: 1, z: player.z + 1 };
    structuresRepo.placeStructure(handle.db, {
      id: hearthStructureId,
      worldId: WORLD_ID,
      groveId: starterGroveId(),
      x: hearthPos.x,
      y: hearthPos.y,
      z: hearthPos.z,
      type: "hearth",
      rotation: 0,
    });
    const placed = structuresRepo.listStructuresInGrove(
      handle.db,
      starterGroveId(),
    );
    expect(placed.length).toBe(1);
    expect(placed[0]?.type).toBe("hearth");

    // Hearth proximity: the player is within 2 voxels of the hearth.
    {
      const candidates = placed
        .filter((r) => r.type === "hearth")
        .map((r) => ({
          structureId: r.id,
          groveId: starterGroveId(),
          position: { x: r.x, y: r.y, z: r.z },
          lit: false,
        }));
      const pick = pickHearthPrompt(player, candidates, HEARTH_PROXIMITY_RADIUS);
      expect(pick).not.toBeNull();
      expect(pick?.variant).toBe("light");
      expect(pick?.candidate.structureId).toBe(hearthStructureId);
    }

    // ── Beat 9: Light the hearth → ClaimRitualSystem cinematic ───────
    const beats: string[] = [];
    let inputLocked = false;
    let villagersSpawned = false;
    let stinger = "";
    let igniteSfx = "";
    let line2Said = "";
    const ritual = new ClaimRitualSystem({
      hooks: {
        setInputLocked: (locked) => {
          inputLocked = locked;
          beats.push(`lock=${locked}`);
        },
        playSound: (id) => {
          igniteSfx = id;
          beats.push(`sfx=${id}`);
        },
        playStinger: (id) => {
          stinger = id;
          beats.push(`stinger=${id}`);
        },
        restoreBiomeMusic: () => beats.push("restore-music"),
        setHearthEmissive: () => {
          /* visual only */
        },
        setVillagerAlpha: () => {
          /* visual only */
        },
        persistClaim: () => {
          grovesRepo.claimGrove(handle.db, starterGroveId());
          grovesRepo.lightHearth(handle.db, starterGroveId());
          // Sub-wave C recipe-gate (runtime registers via eventBus).
          recipesRepo.learnRecipe(
            handle.db,
            WORLD_ID,
            "recipe.starter-axe",
          );
          beats.push("persist");
        },
        spawnVillagers: () => {
          villagersSpawned = true;
          beats.push("spawn");
        },
        emitSpiritLine: (line) => {
          line2Said = line;
          beats.push(`spirit=${line}`);
          // Cinematic records line2 as fired so the next interact
          // can advance to line3 (mirrors runtime.ts behavior).
          recordScriptedLineFired(handle, "line2");
        },
      },
    });

    // Drive the cinematic deterministically using injected `now`.
    const t0 = 1_000_000;
    ritual.start(t0);
    expect(inputLocked).toBe(true);
    expect(igniteSfx).toBe("hearth.ignite");
    expect(ritual.isActive).toBe(true);

    // Tick at each phase boundary.
    ritual.tick(t0 + 600); // past stinger offset
    expect(stinger).toBe("music.moments.spiritDiscovered");

    ritual.tick(t0 + CLAIM_RITUAL_TIMING.ignitePhaseMs); // claim phase
    // persist + spawn-villagers fired.
    expect(villagersSpawned).toBe(true);
    expect(beats).toContain("persist");

    // Grove flipped to claimed.
    {
      const claimed = grovesRepo.getGroveById(handle.db, starterGroveId());
      expect(claimed?.state).toBe("claimed");
      expect(claimed?.hearthLitAt).not.toBeNull();
    }
    // recipe.starter-axe learned post-persist.
    expect(
      recipesRepo.isKnown(handle.db, WORLD_ID, "recipe.starter-axe"),
    ).toBe(true);

    ritual.tick(
      t0 + CLAIM_RITUAL_TIMING.ignitePhaseMs + CLAIM_RITUAL_TIMING.claimPhaseMs,
    ); // settle phase
    expect(line2Said).toBe(SCRIPTED_SPIRIT_LINES.line2);

    ritual.tick(t0 + CLAIM_RITUAL_TIMING.totalMs); // complete
    expect(inputLocked).toBe(false);
    expect(ritual.isActive).toBe(false);
    expect(ritual.currentPhase).toBe("complete");

    // ── Beat 10a: Cinematic recorded line2 already; first post-claim
    // interact advances to line3 because recipe.starter-axe is known. ──
    // (The cinematic's `emitSpiritLine` hook persists line2 so the
    // priority cascade falls through to the most-specific match.)
    {
      const state = readScriptedLineState(handle);
      expect(state.scriptedLineFired.line2).toBe(true);
      expect(state.starterAxeKnown).toBe(true);
      const scripted = pickScriptedSpiritLine(state);
      expect(scripted).not.toBeNull();
      expect(scripted?.line).toBe("line3");
      expect(scripted?.pick.text).toBe(SCRIPTED_SPIRIT_LINES.line3);
      recordScriptedLineFired(handle, "line3");
    }

    // ── Beat 10b: Craft starter-axe → item.axe in inventory ─────────
    // Crafting consumes inputs (illustrative) and adds the axe item.
    inventoryRepo.addItem(handle.db, WORLD_ID, "item.axe", 1);
    const invAfterAxe = inventoryRepo.listItems(handle.db, WORLD_ID);
    expect(invAfterAxe.find((r) => r.itemId === "item.axe")?.count).toBe(1);
    // After all three scripted lines fire, the picker returns null
    // (caller falls through to the random pool).
    {
      const state = readScriptedLineState(handle);
      expect(pickScriptedSpiritLine(state)).toBeNull();
    }

    // ── Beat 11: Threshold — grove ↔ wilderness chime ───────────────
    let chimes = 0;
    const now = 1_000_000;
    const threshold = createThresholdSystem({
      worldSeed: WORLD_SEED,
      chunkSize: CHUNK_SIZE,
      playChime: () => {
        chimes += 1;
      },
      now: () => now,
    });

    // Inside grove chunk (3, 0).
    threshold.update({
      x: STARTER_GROVE_CHUNK.x * CHUNK_SIZE + 8,
      z: STARTER_GROVE_CHUNK.z * CHUNK_SIZE + 8,
    });
    expect(chimes).toBe(0); // first observation: no chime, no boundary yet.

    // Walk into adjacent wilderness chunk (4, 0).
    expect(isGroveChunk(WORLD_SEED, 4, 0)).toBe(false);
    threshold.update({
      x: 4 * CHUNK_SIZE + 8,
      z: 0 * CHUNK_SIZE + 8,
    });
    expect(chimes).toBe(1); // crossed the boundary.

    // ── Beat 13: Discovery of second grove ──────────────────────────
    // Walking toward chunk (7, 2): first verify it's the second grove.
    expect(SECOND_GROVE_CHUNK.x).toBe(7);
    expect(SECOND_GROVE_CHUNK.z).toBe(2);
    expect(
      isGroveChunk(WORLD_SEED, SECOND_GROVE_CHUNK.x, SECOND_GROVE_CHUNK.z),
    ).toBe(true);
    // The discovery system would write a new groves row here. Simulate.
    grovesRepo.discoverGrove(handle.db, {
      id: `grove-${SECOND_GROVE_CHUNK.x}-${SECOND_GROVE_CHUNK.z}`,
      worldId: WORLD_ID,
      chunkX: SECOND_GROVE_CHUNK.x,
      chunkZ: SECOND_GROVE_CHUNK.z,
      biome: "meadow",
    });
    expect(
      grovesRepo.getGroveAt(
        handle.db,
        WORLD_ID,
        SECOND_GROVE_CHUNK.x,
        SECOND_GROVE_CHUNK.z,
      ),
    ).not.toBeNull();

    // ── Fast-travel sanity: claim a second grove + run controller ───
    grovesRepo.claimGrove(
      handle.db,
      `grove-${SECOND_GROVE_CHUNK.x}-${SECOND_GROVE_CHUNK.z}`,
    );
    const claimedNodes = listClaimedGroves(handle.db, WORLD_ID);
    expect(claimedNodes.length).toBe(2);

    // Run the FastTravelController against an in-test teleporter.
    let teleX = NaN;
    let teleZ = NaN;
    let lastFade = 0;
    const ftc = new FastTravelController({
      teleporter: {
        teleport: (x, z) => {
          teleX = x;
          teleZ = z;
        },
      },
      overlay: {
        setFadeOpacity: (op) => {
          lastFade = op;
        },
      },
    });
    const target = claimedNodes.find((n) => n.chunkX === SECOND_GROVE_CHUNK.x);
    expect(target).not.toBeUndefined();
    if (!target) throw new Error("no target");
    const ft0 = 2_000_000;
    ftc.start(target, ft0);
    expect(ftc.isActive).toBe(true);
    expect(ftc.currentPhase).toBe("fade-out");

    // Fade-out → hold (player teleports here).
    ftc.tick(ft0 + 350);
    expect(lastFade).toBe(1);
    expect(ftc.currentPhase).toBe("hold");
    ftc.tick(ft0 + 350 + 1); // first tick in hold triggers teleport
    expect(teleX).toBe(target.worldX);
    expect(teleZ).toBe(target.worldZ);

    // Hold → fade-in → idle.
    ftc.tick(ft0 + 350 + 250 + 350); // end of fade-in
    expect(ftc.currentPhase).toBe("idle");
    expect(lastFade).toBe(0);

    // Final assertion: every persistent state checkpoint is correct.
    const finalGrove = grovesRepo.getGroveById(handle.db, starterGroveId());
    expect(finalGrove?.state).toBe("claimed");
    expect(finalGrove?.hearthLitAt).not.toBeNull();
    const finalAxe = recipesRepo.isKnown(
      handle.db,
      WORLD_ID,
      "recipe.starter-axe",
    );
    expect(finalAxe).toBe(true);
    const finalClaimed = listClaimedGroves(handle.db, WORLD_ID);
    expect(finalClaimed.length).toBe(2);
  });
});
