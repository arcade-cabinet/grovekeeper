# Procedural World Generation

> **SUPERSEDED (2026-03-07):** This document described zone-based world generation with `ZoneConfig` and fixed grids. The design has been replaced by a **chunk-based infinite world** documented in `docs/plans/2026-03-07-unified-game-design.md` Section 4. Key changes:
>
> - **Chunks, not zones.** Generation function is `generateChunk(worldSeed, chunkX, chunkZ)` -- pure function, zero side effects.
> - **Terrain via AdvancedSeededNoise:** fBm + ridged multifractal + domain warping, not sine/cosine octaves.
> - **Biome-driven terrain profiles:** noise parameters vary by biome (temperature + moisture noise), not zone type.
> - **GLB models for trees/structures/props**, not procedural box/cylinder/sphere geometry.
> - **Seamless stitching:** terrain noise uses global coordinates, not chunk-local. No visible boundaries.
> - **Delta-only persistence:** only store what the player changed.
>
> The core principle (pure function, no Three.js, scopedRNG) remains correct. The pipeline and data structures are outdated.
>
> This file is retained for historical reference only. Do not implement from this spec.

---

## HISTORICAL CONTENT BELOW

## Principle

World generation is a pure function: `(seed, zoneConfig) => WorldData`. It produces plain data structures (instance arrays, terrain functions, path graphs) that rendering components consume. Generation logic NEVER touches Three.js objects directly.

All randomness uses `scopedRNG(scope, worldSeed, ...extra)` -- zero `Math.random()`.

## Pipeline

```
ZoneConfig (JSON)
    |
    v
WorldGenerator.generate(seed, config)
    |
    +--> TerrainGenerator    --> heightmap function
    +--> PathGenerator       --> path tile positions + graph
    +--> PlotPlacer          --> structure/tree/tile positions
    +--> InstanceCollector   --> batched instance arrays by material
    |
    v
WorldData { terrain, instances, paths, entities }
    |
    v
Scene components consume WorldData
    +--> <Terrain />         reads heightmap
    +--> <InstancedBatch />  reads instance arrays
    +--> ECS hydration       creates entities for interactive objects
```

## WorldData Interface

```typescript
interface WorldData {
  terrain: {
    heightAt: (wx: number, wz: number) => number;
    size: number;       // world units
    resolution: number; // vertices per side for mesh
  };
  instances: InstanceBatches;
  paths: THREE.Vector3[];  // walkable path positions for NPC AI
  entities: EntitySpawn[]; // things that become ECS entities (trees, NPCs, structures)
}

interface InstanceBatches {
  [materialKey: string]: InstanceData[];
}

interface InstanceData {
  pos: [number, number, number];
  rot?: [number, number, number];
  scale: [number, number, number];
  geometry: 'box' | 'cylinder' | 'sphere' | 'custom';
}

interface EntitySpawn {
  type: 'tree' | 'npc' | 'structure' | 'resource';
  position: [number, number, number];
  data: Record<string, unknown>; // species, stage, npcId, etc.
}
```

## Terrain Generation

Terrain height is computed analytically (no heightmap texture). The function combines multiple sine/cosine octaves with zone-specific flattening.

```typescript
// src/game/world/terrain.ts

export function createTerrainHeight(
  seed: string,
  zoneCenter: [number, number],
  flatRadius: number,
): (wx: number, wz: number) => number {
  const rng = scopedRNG('terrain', seed);
  const phase1 = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;

  return (wx: number, wz: number): number => {
    const dx = wx - zoneCenter[0];
    const dz = wz - zoneCenter[1];
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Flatten near zone center (grove clearing)
    const flattenFactor = Math.max(0, 1 - dist / (flatRadius * 1.2));

    // Two octaves of rolling terrain
    const height =
      (Math.sin(wx * 0.02 + phase1) * Math.cos(wz * 0.03 + phase2) * 3 +
       Math.sin(wx * 0.05 + wz * 0.04 + phase1) * 1.5) *
      (1 - flattenFactor);

    return height;
  };
}
```

### Zone-Specific Terrain Profiles

Defined in `config/game/zones.json`:

| Zone Type | Flat Radius | Amplitude | Notes |
|-----------|-------------|-----------|-------|
| grove | Large | Low | Mostly flat clearing for planting |
| hillside | Small | High | Rolling hills, limited flat area |
| riverside | Medium | Medium | Flat near water, rises at edges |
| mountain | None | Very high | Steep terrain, narrow paths |

## Path Generation

Paths are carved outward from a central point using a random walk with branching. Each path segment marks tiles as PATH in the grid.

```typescript
// src/game/world/pathGenerator.ts

export function generatePaths(
  seed: string,
  gridSize: number,
  center: [number, number],
): TileType[][] {
  const rng = scopedRNG('paths', seed);
  const grid: TileType[][] = Array.from(
    { length: gridSize },
    () => Array(gridSize).fill('EMPTY'),
  );

  // Central clearing (plaza)
  const plazaRadius = 2;
  for (let dx = -plazaRadius; dx <= plazaRadius; dx++) {
    for (let dz = -plazaRadius; dz <= plazaRadius; dz++) {
      const gx = center[0] + dx;
      const gz = center[1] + dz;
      if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
        grid[gx][gz] = 'PATH';
      }
    }
  }

  // Carve roads in 4 cardinal directions
  const directions: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dirX, dirZ] of directions) {
    carveRoad(grid, rng, center, gridSize, dirX, dirZ);
  }

  return grid;
}

function carveRoad(
  grid: TileType[][],
  rng: () => number,
  start: [number, number],
  gridSize: number,
  dirX: number,
  dirZ: number,
): void {
  let [x, z] = start;
  const length = 5 + Math.floor(rng() * (gridSize / 2));

  for (let i = 0; i < length; i++) {
    if (x < 1 || x >= gridSize - 1 || z < 1 || z >= gridSize - 1) break;

    grid[x][z] = 'PATH';

    // Random wobble perpendicular to direction
    if (rng() > 0.7) {
      if (dirX !== 0) {
        z += rng() > 0.5 ? 1 : -1;
      } else {
        x += rng() > 0.5 ? 1 : -1;
      }
    }

    // Random branch
    if (rng() > 0.85 && i > 3) {
      const branchDir: [number, number] = dirX !== 0
        ? [0, rng() > 0.5 ? 1 : -1]
        : [rng() > 0.5 ? 1 : -1, 0];
      carveRoad(grid, rng, [x, z], gridSize, branchDir[0], branchDir[1]);
    }

    x += dirX;
    z += dirZ;
  }
}
```

## Instance Collection

The instance collector walks the generated grid and produces batched arrays grouped by material type. This is the bridge between generation (data) and rendering (Three.js).

```typescript
// src/game/world/instanceCollector.ts

export function collectInstances(
  grid: TileType[][],
  gridSize: number,
  tileSize: number,
  heightAt: (wx: number, wz: number) => number,
  seed: string,
): InstanceBatches {
  const rng = scopedRNG('instances', seed);
  const batches: InstanceBatches = {
    soil: [],    // ground tiles
    path: [],    // walkable paths
    rock: [],    // rock obstacles
    water: [],   // water tiles
    bark: [],    // tree trunks (non-interactive border/decoration)
    leaf: [],    // tree canopies (non-interactive)
  };

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const wx = gx * tileSize;
      const wz = gz * tileSize;
      const wy = heightAt(wx, wz);
      const tile = grid[gx][gz];

      if (tile === 'PATH') {
        batches.path.push({
          pos: [wx, wy + 0.05, wz],
          scale: [tileSize, 0.1, tileSize],
          geometry: 'box',
        });
      } else if (tile === 'EMPTY') {
        batches.soil.push({
          pos: [wx, wy, wz],
          scale: [tileSize, 0.1, tileSize],
          geometry: 'box',
        });
      }
    }
  }

  return batches;
}
```

### Material Grouping Rule

Every visual element belongs to exactly one material batch. Interactive game objects (plantable trees, NPCs, structures) are NOT instances -- they are ECS entities with individual meshes managed by their respective scene components.

| Batch Key | Color Source | What Goes In |
|-----------|-------------|--------------|
| soil | `config/game/biomes.json` | Ground tiles |
| path | `config/game/biomes.json` | Walkable paths |
| rock | `config/game/biomes.json` | Rock obstacles |
| water | `config/game/biomes.json` | Water tiles |
| bark | Brown wood tone | Decorative tree trunks (border trees) |
| leaf | Seasonal palette | Decorative tree canopies |

## Structure Placement

Structures spawn adjacent to paths. The placement algorithm checks for clear 2x2 tile areas next to PATH tiles:

```typescript
function placeStructures(
  grid: TileType[][],
  gridSize: number,
  rng: () => number,
  density: number,
): void {
  for (let x = 2; x < gridSize - 3; x++) {
    for (let z = 2; z < gridSize - 3; z++) {
      if (grid[x][z] !== 'EMPTY') continue;
      if (rng() > density) continue;

      const nearPath =
        grid[x + 1]?.[z] === 'PATH' ||
        grid[x - 1]?.[z] === 'PATH' ||
        grid[x]?.[z + 1] === 'PATH' ||
        grid[x]?.[z - 1] === 'PATH';

      if (!nearPath) continue;

      // Check 2x2 area is clear
      if (
        grid[x + 1][z] === 'EMPTY' &&
        grid[x][z + 1] === 'EMPTY' &&
        grid[x + 1][z + 1] === 'EMPTY'
      ) {
        grid[x][z] = 'STRUCTURE';
        grid[x + 1][z] = 'STRUCTURE';
        grid[x][z + 1] = 'STRUCTURE';
        grid[x + 1][z + 1] = 'STRUCTURE';
      }
    }
  }
}
```

## Decorative Tree Scattering

Non-interactive trees (outside the playable grid) are placed using polar coordinate scattering around the zone center. They exist purely as instances -- no ECS entity, no interaction.

```typescript
function scatterBorderTrees(
  rng: () => number,
  center: [number, number],
  innerRadius: number,
  outerRadius: number,
  count: number,
  heightAt: (wx: number, wz: number) => number,
): { bark: InstanceData[]; leaf: InstanceData[] } {
  const bark: InstanceData[] = [];
  const leaf: InstanceData[] = [];

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = innerRadius + rng() * (outerRadius - innerRadius);
    const tx = center[0] + Math.cos(angle) * dist;
    const tz = center[1] + Math.sin(angle) * dist;
    const ty = heightAt(tx, tz);
    const s = 0.8 + rng() * 0.8;

    bark.push({
      pos: [tx, ty + 2 * s, tz],
      scale: [0.6 * s, 4 * s, 0.6 * s],
      geometry: 'cylinder',
    });
    leaf.push({
      pos: [tx, ty + 4 * s, tz],
      scale: [5 * s, 5 * s, 5 * s],
      geometry: 'sphere',
    });
  }

  return { bark, leaf };
}
```

## File Structure

```
src/game/world/
  WorldGenerator.ts      -- Orchestrator: calls sub-generators, returns WorldData
  terrain.ts             -- createTerrainHeight() pure function
  pathGenerator.ts       -- generatePaths() + carveRoad()
  instanceCollector.ts   -- collectInstances() grid-to-batch converter
  plotPlacer.ts          -- placeStructures() + scatterBorderTrees()
  types.ts               -- WorldData, InstanceBatches, InstanceData, EntitySpawn
  data/
    starting-world.json  -- Level 1-5 zone definitions (hand-authored seeds + overrides)

config/game/
  zones.json             -- Per-zone-type terrain profiles, density, biome
  biomes.json            -- Material colors per biome per season
```

## Interaction with ECS

WorldData contains two categories:

1. **Instances** -- Visual-only, rendered as `<InstancedBatch />`. No ECS entity. No interaction. Examples: ground tiles, border trees, paths, decorative rocks.

2. **Entity spawns** -- Things the player interacts with. Each spawn becomes an ECS entity with components (position, tree, npc, structure). Their meshes are managed by dedicated scene components (`<TreeInstances />`, `<NpcMeshes />`), NOT by the instance batcher.

This split keeps draw calls low (instances) while preserving game logic (ECS entities).

## Config: zones.json

```json
{
  "grove": {
    "gridSize": 16,
    "tileSize": 2,
    "terrain": {
      "flatRadius": 12,
      "amplitude": 1.5,
      "octaves": 2
    },
    "paths": {
      "plazaRadius": 2,
      "branchProbability": 0.15,
      "wobbleProbability": 0.3
    },
    "scatter": {
      "borderTreeCount": 80,
      "innerRadius": 20,
      "outerRadius": 60,
      "structureDensity": 0.08
    }
  }
}
```
