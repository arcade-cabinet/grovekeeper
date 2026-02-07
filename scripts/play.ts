/**
 * Play Grovekeeper — run the GovernorAgent for a full autonomous session.
 *
 * Usage: npx tsx scripts/play.ts
 */

// Minimal BabylonJS stubs for headless mode
globalThis.HTMLCanvasElement ??= class {} as any;
globalThis.navigator ??= { userAgent: "node", vibrate: () => false } as any;

import { world, treesQuery, gridCellsQuery } from "../src/game/ecs/world";
import {
  createPlayerEntity,
  createGridCellEntity,
  createTreeEntity,
} from "../src/game/ecs/archetypes";
import { useGameStore } from "../src/game/stores/gameStore";
import { findHarvestableTrees, findWaterableTrees } from "../src/game/actions/GameActions";
import { HeadlessGameLoop } from "../src/game/testing/HeadlessGameLoop";
import { GovernorAgent, DEFAULT_PROFILE } from "../src/game/testing/GovernorAgent";
import type { GovernorProfile } from "../src/game/testing/GovernorAgent";

// ── Setup ────────────────────────────────────────
const GRID_SIZE = 12;
const TOTAL_TICKS = 18000; // ~10 min of game time at 30 TPS
const REPORT_INTERVAL = 3000; // Report every ~100s game time

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║        GROVEKEEPER — Governor Playthrough           ║");
console.log("║   YukaJS AI agent plays the game autonomously       ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log();

// Clear world
for (const entity of [...world]) world.remove(entity);
useGameStore.getState().resetGame();

// Create player
const player = createPlayerEntity();
player.position!.x = Math.floor(GRID_SIZE / 2);
player.position!.z = Math.floor(GRID_SIZE / 2);
world.add(player);

// Create grid
for (let x = 0; x < GRID_SIZE; x++) {
  for (let z = 0; z < GRID_SIZE; z++) {
    // Sprinkle some rocks and water
    let type: "soil" | "rock" | "water" = "soil";
    if (Math.random() < 0.08) type = "rock";
    else if (Math.random() < 0.05) type = "water";
    world.add(createGridCellEntity(x, z, type));
  }
}

// Count tile types
const soilCount = [...gridCellsQuery].filter(
  (c) => c.gridCell?.type === "soil",
).length;
const rockCount = [...gridCellsQuery].filter(
  (c) => c.gridCell?.type === "rock",
).length;
const waterCount = [...gridCellsQuery].filter(
  (c) => c.gridCell?.type === "water",
).length;

// Give generous starting resources
const store = useGameStore.getState();
store.addSeed("white-oak", 30);
store.addSeed("sugar-maple", 15);
store.addSeed("weeping-willow", 8);
store.addSeed("red-cedar", 10);
store.addSeed("birch", 12);

// Unlock all tools
useGameStore.setState({
  unlockedTools: [
    "trowel",
    "watering-can",
    "axe",
    "pruning-shears",
    "almanac",
    "pickaxe",
  ],
});

console.log(`World: ${GRID_SIZE}x${GRID_SIZE} grid`);
console.log(
  `  Tiles: ${soilCount} soil, ${rockCount} rock, ${waterCount} water`,
);
console.log(
  `  Seeds: ${JSON.stringify(useGameStore.getState().seeds)}`,
);
console.log(
  `  Stamina: ${useGameStore.getState().stamina}/${useGameStore.getState().maxStamina}`,
);
console.log(`  Governor: balanced profile, decision every 15 ticks`);
console.log(
  `  Simulation: ${TOTAL_TICKS} ticks at 30 TPS = ${(TOTAL_TICKS / 30).toFixed(0)}s game time`,
);
console.log();
console.log("─── Starting playthrough... ───────────────────────────");
console.log();

// ── Run ──────────────────────────────────────────
const profile: GovernorProfile = {
  ...DEFAULT_PROFILE,
  plantWeight: 0.85,
  waterWeight: 0.7,
  harvestWeight: 0.95,
  pruneWeight: 0.4,
  exploreWeight: 0.3,
  preferredSpecies: ["white-oak", "sugar-maple", "birch"],
  decisionInterval: 15,
};

const loop = new HeadlessGameLoop({
  ticksPerSecond: 30,
  weatherEnabled: true,
  weatherSeed: Date.now(),
});
const governor = new GovernorAgent(profile, GRID_SIZE);

const startTime = performance.now();

let prevPlanted = 0;
let prevWatered = 0;
let prevHarvested = 0;
let stallTicks = 0;

for (let tick = 1; tick <= TOTAL_TICKS; tick++) {
  governor.update();
  loop.tick();

  // Track stalls
  const s0 = useGameStore.getState();
  if (
    s0.treesPlanted === prevPlanted &&
    s0.treesWatered === prevWatered &&
    s0.treesHarvested === prevHarvested
  ) {
    stallTicks++;
    if (stallTicks === 500) {
      console.log(
        `  [STALL at tick ${tick}] stamina=${s0.stamina.toFixed(1)} ` +
          `seeds=${Object.values(s0.seeds).reduce((a: number, b: number) => a + (b as number), 0)} ` +
          `waterable=${findWaterableTrees().length} harvestable=${findHarvestableTrees().length}`,
      );
    }
  } else {
    if (stallTicks >= 300) {
      console.log(`  [UNSTALL at tick ${tick} after ${stallTicks} stall ticks]`);
    }
    stallTicks = 0;
    prevPlanted = s0.treesPlanted;
    prevWatered = s0.treesWatered;
    prevHarvested = s0.treesHarvested;
  }

  // Periodic report
  if (tick % REPORT_INTERVAL === 0) {
    const s = useGameStore.getState();
    const trees = [...treesQuery];
    const gameTimeSec = (tick / 30).toFixed(0);
    const season = loop.season;
    const weather = loop.weather;

    const stages = [0, 0, 0, 0, 0];
    for (const t of trees) {
      if (t.tree) stages[Math.min(t.tree.stage, 4)]++;
    }

    const harvestable = findHarvestableTrees().length;
    const waterable = findWaterableTrees().length;
    const seedsLeft = Object.values(s.seeds).reduce((a: number, b: number) => a + (b as number), 0);

    console.log(`  [${gameTimeSec}s | ${season} | ${weather}]`);
    console.log(
      `    Trees: ${trees.length} alive (seed:${stages[0]} sprout:${stages[1]} sapling:${stages[2]} mature:${stages[3]} old:${stages[4]})`,
    );
    console.log(
      `    Actionable: ${waterable} waterable, ${harvestable} harvestable, ${seedsLeft} seeds left`,
    );
    console.log(
      `    Planted: ${s.treesPlanted} | Watered: ${s.treesWatered} | Harvested: ${s.treesHarvested}`,
    );
    console.log(
      `    Resources: timber=${s.resources.timber} sap=${s.resources.sap} fruit=${s.resources.fruit} acorns=${s.resources.acorns}`,
    );
    console.log(
      `    Level ${s.level} | XP: ${s.xp} | Stamina: ${s.stamina.toFixed(0)}/${s.maxStamina}`,
    );
    console.log();
  }
}

const elapsed = performance.now() - startTime;

// ── Final Report ─────────────────────────────────
const final = useGameStore.getState();
const finalTrees = [...treesQuery];
const stages = [0, 0, 0, 0, 0];
for (const t of finalTrees) {
  if (t.tree) stages[Math.min(t.tree.stage, 4)]++;
}

// Species breakdown
const speciesMap = new Map<string, number>();
for (const t of finalTrees) {
  if (t.tree?.speciesId) {
    speciesMap.set(t.tree.speciesId, (speciesMap.get(t.tree.speciesId) ?? 0) + 1);
  }
}

console.log("═══════════════════════════════════════════════════════");
console.log("              FINAL PLAYTHROUGH REPORT                ");
console.log("═══════════════════════════════════════════════════════");
console.log();
console.log(`  Game time: ${(TOTAL_TICKS / 30).toFixed(0)} seconds (${(TOTAL_TICKS / 30 / 60).toFixed(1)} minutes)`);
console.log(`  Real time: ${elapsed.toFixed(0)}ms`);
console.log(`  Season: ${loop.season} | Weather: ${loop.weather}`);
console.log();
console.log("  GROVE");
console.log(`    Trees alive: ${finalTrees.length}`);
console.log(`    Stages: seed=${stages[0]} sprout=${stages[1]} sapling=${stages[2]} mature=${stages[3]} old-growth=${stages[4]}`);
console.log(`    Species:`);
for (const [sp, count] of [...speciesMap.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`      ${sp}: ${count}`);
}
console.log();
console.log("  STATS");
console.log(`    Trees planted: ${final.treesPlanted}`);
console.log(`    Trees watered: ${final.treesWatered}`);
console.log(`    Trees harvested: ${final.treesHarvested}`);
console.log(`    Species discovered: [${final.speciesPlanted.join(", ")}]`);
console.log();
console.log("  RESOURCES");
console.log(`    Timber: ${final.resources.timber}`);
console.log(`    Sap: ${final.resources.sap}`);
console.log(`    Fruit: ${final.resources.fruit}`);
console.log(`    Acorns: ${final.resources.acorns}`);
console.log();
console.log("  PLAYER");
console.log(`    Level: ${final.level}`);
console.log(`    XP: ${final.xp}`);
console.log(`    Stamina: ${final.stamina.toFixed(0)}/${final.maxStamina}`);
console.log(`    Seeds remaining: ${JSON.stringify(final.seeds)}`);
console.log();
console.log("  GOVERNOR AI");
console.log(`    Decisions made: ${governor.stats.decisionsMade}`);
console.log(`    Plants attempted: ${governor.stats.plantsAttempted}`);
console.log(`    Waters attempted: ${governor.stats.watersAttempted}`);
console.log(`    Harvests attempted: ${governor.stats.harvestsAttempted}`);
console.log(`    Prunes attempted: ${governor.stats.prunesAttempted}`);
console.log(`    Idle ticks: ${governor.stats.idleTicks}`);
console.log();
console.log("═══════════════════════════════════════════════════════");
console.log("  Every forest begins with a single seed.");
console.log("═══════════════════════════════════════════════════════");
