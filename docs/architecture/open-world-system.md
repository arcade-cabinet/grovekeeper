# Open World System -- Design Specification

> **SUPERSEDED (2026-03-07):** This document described a hex-grid zone-based world system. The design has been replaced by a **chunk-based infinite procedural world** documented in `docs/plans/2026-03-07-unified-game-design.md` Section 4. Key changes:
>
> - **No hex grid.** The world is an infinite 2D plane of 16x16 tile chunks.
> - **No zone boundaries or loading screens.** Chunks generate seamlessly on demand.
> - **No fixed world size.** Player walks in any direction forever.
> - **Delta-only persistence.** Only player-modified chunks are stored; unmodified terrain regenerates from seed.
> - **Biome determination via global noise** (temperature + moisture), not per-zone assignment.
> - **Discovery cadence:** Major features every 8-12 chunks, minor every 3-4, micro every 1.
> - **14 Grovekeeper Labyrinths** as the world's rarest features (every 30-50 chunks).
> - **Procedural NPCs and quests** generated at feature points from seed.
> - **Chunk generation budget:** <16ms per chunk.
>
> This file is retained for historical reference only. Do not implement from this spec.

---

## HISTORICAL CONTENT BELOW

## Overview

This document specifies the open world system for Grovekeeper: a procedurally generated, explorable world composed of interconnected zones arranged on a hex-influenced grid. The goal is to transform the game from a single-zone demo into a living world with meaningful exploration, distinct biomes, persistent state, and discovery-driven progression.

The system builds on the existing `WorldGenerator`, `ZoneLoader`, `ZoneDefinition`, and `discovery` infrastructure. It extends them with a proper world graph, 8 biome types, a fog-of-war map, zone persistence, and exploration rewards.

---

## 1. World Map Structure

### 1.1 Layout: Axial Hex Grid

The world is arranged on an **axial hex grid** of zone slots. Each slot holds one zone. The hex layout gives 6 natural connection directions and avoids the "Manhattan distance" feel of a square grid.

```
         [   ]  [   ]  [   ]
       [   ]  [HUB]  [   ]  [   ]
     [   ]  [   ]  [   ]  [   ]
       [   ]  [   ]  [   ]  [   ]
         [   ]  [   ]  [   ]
```

Axial coordinates use `(q, r)` where:
- `q` = column offset
- `r` = row offset
- The 6 hex neighbors of `(q, r)` are:
  `(q+1,r)`, `(q-1,r)`, `(q,r+1)`, `(q,r-1)`, `(q+1,r-1)`, `(q-1,r+1)`

The player's **Starting Grove** is always at `(0, 0)`.

### 1.2 World Size by Progression

| Player Level | World Radius | Total Zone Slots | Populated Slots | Notes |
|-------------|-------------|-----------------|----------------|-------|
| 1-4 | 1 | 7 | 3-4 | Tutorial cluster |
| 5-9 | 2 | 19 | 8-12 | First expansion |
| 10-14 | 3 | 37 | 16-22 | Mid-game |
| 15-19 | 4 | 61 | 28-38 | Late-game |
| 20-24 | 5 | 91 | 45-60 | Endgame |
| 25+ (prestige) | 6 | 127 | 65-85 | Post-prestige |

**Formula for hex grid slot count:** `3 * radius * (radius + 1) + 1`

**Population density:** `0.55 + 0.10 * min(radius, 6)` of slots are populated (rest are impassable wilderness).

### 1.3 Zone Sizes

Each zone is a tile grid. Size varies by biome:

| Biome | Min Size | Max Size | Typical |
|-------|---------|---------|---------|
| Starting Grove | 14x14 | 14x14 | 14x14 (fixed) |
| Meadow | 10x10 | 14x14 | 12x12 |
| Ancient Forest | 8x8 | 12x12 | 10x10 |
| Wetlands | 8x8 | 12x12 | 10x10 |
| Rocky Highlands | 6x6 | 10x10 | 8x8 |
| Orchard Valley | 10x10 | 14x14 | 12x12 |
| Frozen Peaks | 6x6 | 8x8 | 8x8 |
| Twilight Glade | 6x6 | 10x10 | 8x8 |

### 1.4 Connection Model

Each populated zone connects to 1-6 neighbors (matching the hex adjacency). Connections are bidirectional. Every populated zone must be **reachable** from the Starting Grove -- the generator validates connectivity and adds bridge connections if needed.

A connection manifests as a **path exit** on the zone edge: 2-3 path tiles leading to the border, with a visible signpost prop indicating the destination zone name and direction.

### 1.5 Discovery / Fog of War

- **Undiscovered zones:** Shown as dark silhouette hexes on the world map. No name, no biome, no details.
- **Adjacent-to-discovered zones:** Shown as slightly lighter hexes with a "?" icon. The biome is hinted by border color (green for forest, blue for wetland, etc.) but the name is hidden.
- **Discovered zones:** Full color hex with zone name, biome icon, and a miniature representation of key landmarks.
- **Current zone:** Highlighted border with a player icon.

Discovery happens when the player enters a zone for the first time. This triggers:
1. `discoverZone(zoneId)` in the game store (already exists)
2. +75 XP bonus (increased from current 50 to reward exploration)
3. A codex entry for the zone's biome (if first zone of that biome)
4. Toast notification with zone name and biome

### 1.6 World Map UI

The world map is a **full-screen overlay** (mobile) or **side panel** (desktop) accessed via a MAP button on the HUD (bottom-left, 48x48px touch target).

```
+------------------------------------------+
|  GROVEKEEPER VALLEY          [X Close]   |
|                                          |
|        [ ? ]  [MED]                      |
|     [FOR]  [GRV]  [ ? ]                  |
|        [WET]  [ORC]                      |
|           [ ? ]                          |
|                                          |
|  [GRV] Starting Grove    <-- selected    |
|  Biome: Grove                            |
|  Trees planted: 12                       |
|  Discovered: Day 1                       |
|                                          |
|  [TRAVEL]        [CODEX]                 |
+------------------------------------------+
```

- Hex tiles are rendered as flat SVG hexagons (no canvas, no WebGL -- pure React)
- Pinch-to-zoom on mobile (scale range: 0.5x to 2.0x)
- Tap a discovered zone to see details in a bottom sheet
- TRAVEL button initiates zone transition (see Section 2)
- Undiscovered zones adjacent to discovered ones show a faint biome-colored border

---

## 2. Zone Transitions

### 2.1 Trigger Mechanisms

A zone transition is triggered when:

1. **Walk to edge:** Player moves onto a connection exit tile (the 2-3 path tiles at the zone border). A prompt appears: "Enter [Zone Name]? [Yes] [No]". Tap Yes or press Enter to transition.
2. **World map travel:** Player opens the map, selects a discovered zone, and taps TRAVEL. Only works for zones within 2 hops of the current zone (no fast-travel to distant zones until level 15+).
3. **Fast travel (level 15+):** Unlocked at level 15. Player can travel to any discovered zone from the map. Costs 10 stamina per hop distance.

### 2.2 Transition Sequence

Total transition time budget: **<500ms**.

```
Frame 0:     Player triggers transition
Frame 1:     Fade overlay to black (150ms CSS transition)
Frame 2-3:   Unload current zone entities from ECS (unloadZoneEntities)
             Save current zone state to zone cache
             Load target zone data (from cache or generate)
             Load target zone entities into ECS (loadZoneEntities)
             Place player at the connection entry tile
Frame 4:     Fade overlay from black (150ms CSS transition)
Frame 5:     Transition complete, game loop resumes
```

The fade overlay is a CSS `<div>` with `pointer-events: none` and `opacity` transition -- zero GPU cost.

### 2.3 Pre-loading Strategy

When a zone is active, its **direct neighbors** (connected zones) are pre-generated and cached in memory as `ZoneDefinition` objects (data only, no ECS entities, no meshes). This means the transition only needs to:
1. Unload current ECS entities
2. Load pre-cached zone definition into ECS
3. Build meshes

Pre-cached zone definitions are lightweight (~2-5 KB each as JSON). With a maximum of 6 neighbors, pre-cache costs ~30 KB memory.

### 2.4 State Persistence on Zone Exit

When leaving a zone, the following state is captured and stored in the **zone state cache**:

```typescript
interface ZoneStateSnapshot {
  zoneId: string;
  savedAt: number;                    // timestamp
  trees: SerializedTree[];            // all player-planted trees
  wildTrees: SerializedWildTree[];    // wild tree states (stage, harvested)
  modifiedTiles: ModifiedTile[];      // tiles changed from default (e.g., watered soil)
  structures: PlacedStructure[];      // player-placed structures
  regrowthTimers: RegrowthTimer[];    // pending wild tree respawns
}
```

**What persists:**
- Player-planted trees: full state (species, stage, progress, watered)
- Wild trees: current stage, whether harvested, regrowth timers
- Player-placed structures: position, template, orientation
- Modified tiles: type changes from player actions

**What does NOT persist:**
- NPC positions (NPCs respawn at their defined positions on zone load)
- Prop states (decorative props are regenerated from zone definition)
- Weather state (weather is global, not per-zone)

### 2.5 Re-entering a Zone

When the player re-enters a previously visited zone:

1. Load the `ZoneDefinition` (from starting-world.json or procedural cache)
2. Load the `ZoneStateSnapshot` from the zone state cache
3. Call `loadZoneEntities(zone)` to create base grid cells
4. Apply the snapshot: restore tree states, modified tiles, structures
5. Calculate offline growth for all trees in this zone since `savedAt`
6. Spawn NPCs at their defined positions

Trees that were growing when the player left will have progressed based on elapsed time (same formula as the existing `offlineGrowth` system, capped at 24 hours).

---

## 3. Procedural Zone Generation

### 3.1 Seed Derivation

Each zone gets a deterministic seed derived from the world seed and its axial coordinates:

```typescript
function zoneSeeed(worldSeed: string, q: number, r: number): string {
  return `${worldSeed}:zone:${q}:${r}`;
}
```

This means the same world seed always produces the same world layout and zone contents.

### 3.2 Biome Assignment Algorithm

Biome assignment uses a combination of **distance from center** and **noise-based clustering** to create natural-feeling biome regions.

```
function assignBiome(q: number, r: number, worldSeed: string, level: number): BiomeId {
  const rng = createRNG(hashString(`${worldSeed}:biome:${q}:${r}`));
  const dist = hexDistance(q, r, 0, 0);  // distance from Starting Grove

  // Distance-based biome pools with weights
  if (dist === 0) return "starting-grove";

  const pool = getBiomePool(dist, level, rng);
  return pickWeighted(rng, pool);
}

function getBiomePool(dist, level, rng): WeightedBiome[] {
  // Ring 1 (dist 1): Safe biomes
  if (dist === 1) return [
    { value: "meadow",         weight: 4 },
    { value: "orchard-valley", weight: 3 },
    { value: "ancient-forest", weight: 2 },
  ];

  // Ring 2 (dist 2): Moderate biomes
  if (dist === 2) return [
    { value: "meadow",           weight: 2 },
    { value: "ancient-forest",   weight: 4 },
    { value: "orchard-valley",   weight: 3 },
    { value: "wetlands",         weight: 3 },
    { value: "rocky-highlands",  weight: level >= 10 ? 2 : 0 },
  ];

  // Ring 3 (dist 3): Challenging biomes
  if (dist === 3) return [
    { value: "ancient-forest",   weight: 3 },
    { value: "wetlands",         weight: 3 },
    { value: "rocky-highlands",  weight: 4 },
    { value: "orchard-valley",   weight: 2 },
    { value: "frozen-peaks",     weight: level >= 15 ? 2 : 0 },
  ];

  // Ring 4+ (dist 4+): All biomes including rare
  return [
    { value: "ancient-forest",   weight: 2 },
    { value: "wetlands",         weight: 2 },
    { value: "rocky-highlands",  weight: 3 },
    { value: "frozen-peaks",     weight: 3 },
    { value: "twilight-glade",   weight: level >= 20 ? 1 : 0 },
    { value: "meadow",           weight: 1 },
    { value: "orchard-valley",   weight: 1 },
  ];
}
```

### 3.3 Biome Archetype Definitions

Each biome defines terrain rules, vegetation, props, colors, and bonuses.

```typescript
interface BiomeArchetype {
  id: BiomeId;
  name: string;
  zoneType: ZoneType;         // maps to existing zone bonus system
  sizeRange: { min: number; max: number };
  groundMaterial: GroundMaterial;
  terrain: {
    heightAmplitude: number;  // max terrain height variation
    heightFrequency: number;  // noise frequency (higher = more hills)
    flatRadius: number;       // flat area in center (tile units)
  };
  tileRules: {
    waterPct: number;
    rockPct: number;
    pathPct: number;
  };
  waterFeature: {
    type: "none" | "pond" | "stream" | "lake" | "river";
    probability: number;      // 0-1 chance of water feature
    minSize: number;          // minimum water tiles
    maxSize: number;          // maximum water tiles
  };
  vegetation: {
    wildTreeDensity: number;  // fraction of soil tiles with wild trees
    wildTrees: WildTreeSpec[];
    propDensity: number;
    props: WeightedProp[];
  };
  colors: {
    groundPrimary: string;    // hex color
    groundSecondary: string;  // hex color for variation
    fog: string;              // ambient fog color
    ambientLight: string;     // ambient light tint
  };
  bonuses: ZoneBonus[];
  plantable: boolean;
  difficulty: number;         // 1-5, affects wild tree stages and hazards
  minLevel: number;           // minimum player level to generate
}
```

### 3.4 The 8 Biomes

#### Starting Grove (id: "starting-grove")

The player's home base. Safe, abundant, tutorial-friendly.

```json
{
  "id": "starting-grove",
  "name": "Starting Grove",
  "zoneType": "grove",
  "sizeRange": { "min": 14, "max": 14 },
  "groundMaterial": "soil",
  "terrain": { "heightAmplitude": 0.5, "heightFrequency": 0.02, "flatRadius": 8 },
  "tileRules": { "waterPct": 0.04, "rockPct": 0.03, "pathPct": 0.05 },
  "waterFeature": { "type": "pond", "probability": 1.0, "minSize": 3, "maxSize": 5 },
  "vegetation": {
    "wildTreeDensity": 0,
    "wildTrees": [],
    "propDensity": 0.03,
    "props": [
      { "value": "wild-flowers", "weight": 4 },
      { "value": "mushroom-cluster", "weight": 1 },
      { "value": "stump", "weight": 1 }
    ]
  },
  "colors": {
    "groundPrimary": "#4a7c3f",
    "groundSecondary": "#5a8c4f",
    "fog": "#c8e6c8",
    "ambientLight": "#ffe8c8"
  },
  "bonuses": [{ "type": "growth_boost", "magnitude": 0.15 }],
  "plantable": true,
  "difficulty": 1,
  "minLevel": 1
}
```

#### Meadow (id: "meadow")

Open grasslands with flowers, wind, and fast growth.

```json
{
  "id": "meadow",
  "name": "Sunlit Meadow",
  "zoneType": "clearing",
  "sizeRange": { "min": 10, "max": 14 },
  "groundMaterial": "grass",
  "terrain": { "heightAmplitude": 1.0, "heightFrequency": 0.03, "flatRadius": 6 },
  "tileRules": { "waterPct": 0.06, "rockPct": 0.01, "pathPct": 0.03 },
  "waterFeature": { "type": "pond", "probability": 0.6, "minSize": 2, "maxSize": 4 },
  "vegetation": {
    "wildTreeDensity": 0.08,
    "wildTrees": [
      { "speciesId": "cherry-blossom", "weight": 3 },
      { "speciesId": "silver-birch", "weight": 3 },
      { "speciesId": "white-oak", "weight": 2 }
    ],
    "propDensity": 0.06,
    "props": [
      { "value": "wild-flowers", "weight": 6 },
      { "value": "tall-grass", "weight": 4 },
      { "value": "butterfly-bush", "weight": 2 },
      { "value": "boulder", "weight": 1 }
    ]
  },
  "colors": {
    "groundPrimary": "#6b9b3a",
    "groundSecondary": "#8ab842",
    "fog": "#e8f0d0",
    "ambientLight": "#fff5d4"
  },
  "bonuses": [
    { "type": "growth_boost", "magnitude": 0.20 },
    { "type": "xp_boost", "magnitude": 0.10 }
  ],
  "plantable": true,
  "difficulty": 1,
  "minLevel": 1
}
```

#### Ancient Forest (id: "ancient-forest")

Dense, dark canopy. Tall wild trees, mushrooms, rare species.

```json
{
  "id": "ancient-forest",
  "name": "Ancient Forest",
  "zoneType": "forest",
  "sizeRange": { "min": 8, "max": 12 },
  "groundMaterial": "grass",
  "terrain": { "heightAmplitude": 2.0, "heightFrequency": 0.04, "flatRadius": 3 },
  "tileRules": { "waterPct": 0.03, "rockPct": 0.08, "pathPct": 0.04 },
  "waterFeature": { "type": "stream", "probability": 0.4, "minSize": 3, "maxSize": 8 },
  "vegetation": {
    "wildTreeDensity": 0.35,
    "wildTrees": [
      { "speciesId": "redwood", "weight": 3 },
      { "speciesId": "white-oak", "weight": 3 },
      { "speciesId": "elder-pine", "weight": 2 },
      { "speciesId": "ironbark", "weight": 2 },
      { "speciesId": "baobab", "weight": 1 },
      { "speciesId": "mystic-fern", "weight": 1 }
    ],
    "propDensity": 0.08,
    "props": [
      { "value": "fallen-log", "weight": 4 },
      { "value": "mushroom-cluster", "weight": 5 },
      { "value": "boulder", "weight": 2 },
      { "value": "stump", "weight": 3 },
      { "value": "moss-patch", "weight": 3 },
      { "value": "fern-cluster", "weight": 2 }
    ]
  },
  "colors": {
    "groundPrimary": "#2d4a1e",
    "groundSecondary": "#3a5c28",
    "fog": "#1a3a1a",
    "ambientLight": "#8ab87a"
  },
  "bonuses": [{ "type": "harvest_boost", "magnitude": 0.25 }],
  "plantable": false,
  "difficulty": 3,
  "minLevel": 5
}
```

#### Wetlands (id: "wetlands")

Water-heavy zone with unique aquatic species.

```json
{
  "id": "wetlands",
  "name": "Misty Wetlands",
  "zoneType": "clearing",
  "sizeRange": { "min": 8, "max": 12 },
  "groundMaterial": "dirt",
  "terrain": { "heightAmplitude": 0.3, "heightFrequency": 0.02, "flatRadius": 10 },
  "tileRules": { "waterPct": 0.25, "rockPct": 0.02, "pathPct": 0.03 },
  "waterFeature": { "type": "lake", "probability": 1.0, "minSize": 8, "maxSize": 18 },
  "vegetation": {
    "wildTreeDensity": 0.15,
    "wildTrees": [
      { "speciesId": "weeping-willow", "weight": 5 },
      { "speciesId": "silver-birch", "weight": 3 },
      { "speciesId": "mystic-fern", "weight": 2 }
    ],
    "propDensity": 0.05,
    "props": [
      { "value": "reed-cluster", "weight": 5 },
      { "value": "lily-pad", "weight": 4 },
      { "value": "mushroom-cluster", "weight": 3 },
      { "value": "moss-patch", "weight": 3 },
      { "value": "cattail", "weight": 2 }
    ]
  },
  "colors": {
    "groundPrimary": "#4a6b3a",
    "groundSecondary": "#5c7a4a",
    "fog": "#8aaa9a",
    "ambientLight": "#c8d8c8"
  },
  "bonuses": [
    { "type": "water_retention", "magnitude": 0.30 },
    { "type": "growth_boost", "magnitude": 0.10 }
  ],
  "plantable": true,
  "difficulty": 2,
  "minLevel": 5
}
```

#### Rocky Highlands (id: "rocky-highlands")

Sparse vegetation, mineral resources, wind exposure.

```json
{
  "id": "rocky-highlands",
  "name": "Rocky Highlands",
  "zoneType": "path",
  "sizeRange": { "min": 6, "max": 10 },
  "groundMaterial": "stone",
  "terrain": { "heightAmplitude": 4.0, "heightFrequency": 0.06, "flatRadius": 2 },
  "tileRules": { "waterPct": 0.02, "rockPct": 0.25, "pathPct": 0.08 },
  "waterFeature": { "type": "stream", "probability": 0.3, "minSize": 2, "maxSize": 4 },
  "vegetation": {
    "wildTreeDensity": 0.10,
    "wildTrees": [
      { "speciesId": "elder-pine", "weight": 4 },
      { "speciesId": "ironbark", "weight": 4 },
      { "speciesId": "ghost-birch", "weight": 1 }
    ],
    "propDensity": 0.04,
    "props": [
      { "value": "boulder", "weight": 6 },
      { "value": "rock-formation", "weight": 4 },
      { "value": "gravel-patch", "weight": 3 },
      { "value": "wind-flag", "weight": 1 }
    ]
  },
  "colors": {
    "groundPrimary": "#7a6b5a",
    "groundSecondary": "#8c7d6c",
    "fog": "#c8baa8",
    "ambientLight": "#d8d0c0"
  },
  "bonuses": [{ "type": "stamina_regen", "magnitude": 0.15 }],
  "plantable": false,
  "difficulty": 4,
  "minLevel": 10
}
```

#### Orchard Valley (id: "orchard-valley")

Fruit trees, harvest bonuses, cultivated feel.

```json
{
  "id": "orchard-valley",
  "name": "Orchard Valley",
  "zoneType": "grove",
  "sizeRange": { "min": 10, "max": 14 },
  "groundMaterial": "soil",
  "terrain": { "heightAmplitude": 1.0, "heightFrequency": 0.025, "flatRadius": 7 },
  "tileRules": { "waterPct": 0.05, "rockPct": 0.02, "pathPct": 0.06 },
  "waterFeature": { "type": "pond", "probability": 0.5, "minSize": 2, "maxSize": 4 },
  "vegetation": {
    "wildTreeDensity": 0.20,
    "wildTrees": [
      { "speciesId": "golden-apple", "weight": 5 },
      { "speciesId": "cherry-blossom", "weight": 4 },
      { "speciesId": "flame-maple", "weight": 3 }
    ],
    "propDensity": 0.04,
    "props": [
      { "value": "wild-flowers", "weight": 3 },
      { "value": "fence-section", "weight": 3 },
      { "value": "birdbath", "weight": 1 },
      { "value": "stump", "weight": 2 },
      { "value": "beehive", "weight": 1 }
    ]
  },
  "colors": {
    "groundPrimary": "#5a7a3a",
    "groundSecondary": "#6a8a4a",
    "fog": "#e0e8c0",
    "ambientLight": "#fff0c8"
  },
  "bonuses": [
    { "type": "harvest_boost", "magnitude": 0.30 },
    { "type": "growth_boost", "magnitude": 0.05 }
  ],
  "plantable": true,
  "difficulty": 2,
  "minLevel": 5
}
```

#### Frozen Peaks (id: "frozen-peaks")

Winter-locked zone. Only hardy species survive. Slow growth, unique rewards.

```json
{
  "id": "frozen-peaks",
  "name": "Frozen Peaks",
  "zoneType": "path",
  "sizeRange": { "min": 6, "max": 8 },
  "groundMaterial": "stone",
  "terrain": { "heightAmplitude": 5.0, "heightFrequency": 0.07, "flatRadius": 1 },
  "tileRules": { "waterPct": 0.08, "rockPct": 0.20, "pathPct": 0.05 },
  "waterFeature": { "type": "pond", "probability": 0.7, "minSize": 2, "maxSize": 5 },
  "vegetation": {
    "wildTreeDensity": 0.06,
    "wildTrees": [
      { "speciesId": "ghost-birch", "weight": 5 },
      { "speciesId": "elder-pine", "weight": 4 },
      { "speciesId": "ironbark", "weight": 2 }
    ],
    "propDensity": 0.03,
    "props": [
      { "value": "boulder", "weight": 4 },
      { "value": "ice-crystal", "weight": 3 },
      { "value": "snow-drift", "weight": 4 },
      { "value": "frost-fern", "weight": 2 }
    ]
  },
  "colors": {
    "groundPrimary": "#a8b8c8",
    "groundSecondary": "#c0d0e0",
    "fog": "#d8e0e8",
    "ambientLight": "#e0e8f0"
  },
  "bonuses": [],
  "plantable": false,
  "difficulty": 5,
  "minLevel": 15
}
```

**Special rule:** All growth rates in Frozen Peaks are multiplied by 0.5 regardless of season. Water tiles are "ice" (visual only -- same walkability as water). Only evergreen species can be planted if plantable slots exist.

#### Twilight Glade (id: "twilight-glade")

Prestige-only zone. Glowing trees, rare species, magical ambiance.

```json
{
  "id": "twilight-glade",
  "name": "Twilight Glade",
  "zoneType": "grove",
  "sizeRange": { "min": 6, "max": 10 },
  "groundMaterial": "grass",
  "terrain": { "heightAmplitude": 1.5, "heightFrequency": 0.03, "flatRadius": 5 },
  "tileRules": { "waterPct": 0.06, "rockPct": 0.04, "pathPct": 0.03 },
  "waterFeature": { "type": "pond", "probability": 0.8, "minSize": 3, "maxSize": 6 },
  "vegetation": {
    "wildTreeDensity": 0.25,
    "wildTrees": [
      { "speciesId": "ghost-birch", "weight": 4 },
      { "speciesId": "crystal-oak", "weight": 3 },
      { "speciesId": "moonwood-ash", "weight": 3 },
      { "speciesId": "mystic-fern", "weight": 2 }
    ],
    "propDensity": 0.06,
    "props": [
      { "value": "glow-mushroom", "weight": 4 },
      { "value": "spirit-wisp", "weight": 3 },
      { "value": "crystal-formation", "weight": 2 },
      { "value": "ancient-stump", "weight": 2 },
      { "value": "moss-patch", "weight": 2 }
    ]
  },
  "colors": {
    "groundPrimary": "#2a3a4a",
    "groundSecondary": "#3a4a5a",
    "fog": "#1a2a3a",
    "ambientLight": "#6a5a8a"
  },
  "bonuses": [
    { "type": "growth_boost", "magnitude": 0.10 },
    { "type": "harvest_boost", "magnitude": 0.15 },
    { "type": "xp_boost", "magnitude": 0.20 }
  ],
  "plantable": true,
  "difficulty": 3,
  "minLevel": 20
}
```

**Special rule:** Only appears in worlds where `prestigeCount >= 1`. Twilight Glades have a permanent dusk lighting state (time of day is frozen at 18:00 visually). Wild trees here glow faintly at all times.

### 3.5 Zone Generation Pipeline

```
Input: (worldSeed, q, r, playerLevel, prestigeCount)
  |
  v
1. Derive zone seed: `${worldSeed}:zone:${q}:${r}`
  |
  v
2. Assign biome via getBiomePool(dist, level) + pickWeighted
  |
  v
3. Roll zone size within biome's sizeRange
  |
  v
4. Generate tile overrides:
   a. Place water feature (pond/stream/lake) if probability roll succeeds
   b. Scatter remaining water tiles to reach waterPct
   c. Scatter rock tiles to reach rockPct
   d. Carve paths: guaranteed path from each connection exit to center
   e. Fill remaining with ground material
  |
  v
5. Generate connections:
   a. For each hex neighbor that is also populated, create a connection
   b. Place 2-3 path tiles at each connection edge
   c. Place signpost prop at connection exit
  |
  v
6. Place wild trees on soil tiles at wildTreeDensity
  |
  v
7. Place props on remaining empty soil tiles at propDensity
  |
  v
8. Place landmark (1 per zone, seeded selection -- see Section 4.3)
  |
  v
9. Assign NPCs (0-3 per zone based on biome, see Section 4.4)
  |
  v
Output: ZoneDefinition
```

### 3.6 Water Feature Generation

Water features are more interesting than random scatter. Each type has a generation algorithm:

**Pond:** Grow from a random center using BFS (reuses existing `growPond` from `gridGeneration.ts`).

**Stream:** Carve a 1-tile-wide path from one zone edge to another, with random wobble. Perpendicular to the two most distant zone connections.

```
function generateStream(rng, width, height, minSize, maxSize):
  startEdge = pickRandom(rng, ["north", "south", "east", "west"])
  // Start from a random point on the chosen edge
  // Walk toward opposite edge with random lateral steps
  // Place water tiles along the path
  // Width: 1 tile, occasional 2-tile widening
```

**Lake:** Same as pond but larger (8-18 tiles) and placed in the zone's lowest terrain area.

**River:** Like stream but 2 tiles wide. Only appears in wetlands.

### 3.7 Path Connectivity Guarantee

Every zone must have a walkable path from each connection exit to the zone center. The generator uses the following algorithm:

```
function ensurePathConnectivity(tiles, connections, center, rng):
  for each connection:
    entryTile = connection.localEntry
    // A* pathfind from entryTile to center on the tile grid
    // Mark each tile along the path as "path" type
    // If A* fails (blocked by rocks/water), remove obstacles along a straight line
```

This guarantees the player can always reach the center of any zone from any entry point.

---

## 4. Exploration Incentives

### 4.1 Discovery Rewards

| Discovery Type | Reward | Notes |
|---------------|--------|-------|
| First visit to any zone | +75 XP | Triggers toast |
| First visit to a new biome | +150 XP, biome codex entry | 8 biomes total |
| Find a landmark | +100 XP, landmark codex entry | 1 per zone |
| Find a rare zone | +250 XP, unique species seed x3 | See Section 4.5 |
| Discover all zones in a ring | +500 XP, title unlock | Ring = same hex distance |
| Visit 50% of world zones | +1000 XP, "Explorer" achievement | Achievement system |
| Visit 100% of world zones | +2000 XP, "Cartographer" achievement | Achievement system |

### 4.2 Biome-Exclusive Species

Certain species only appear as wild trees in specific biomes, incentivizing exploration to discover and harvest seeds:

| Species | Exclusive Biome | Notes |
|---------|----------------|-------|
| Weeping Willow | Wetlands | Only wild in wetlands |
| Redwood | Ancient Forest | Only wild in ancient forest |
| Ghost Birch | Frozen Peaks | Wild in frozen peaks + twilight glade |
| Golden Apple | Orchard Valley | Only wild in orchard valley |
| Ironbark | Rocky Highlands | Wild in highlands + ancient forest |
| Mystic Fern | Twilight Glade | Wild in twilight glade + ancient forest (rare) |
| Crystal Oak | Twilight Glade | Only wild in twilight glade |
| Moonwood Ash | Twilight Glade | Only wild in twilight glade |

When the player harvests a wild tree species they haven't unlocked yet, they receive 1-3 seeds of that species (seeded random). This is the primary unlock mechanism for biome-exclusive species -- you must explore to find them.

### 4.3 Landmarks

Every zone contains exactly 1 **landmark** -- a unique structure or natural feature placed at a seeded position. Landmarks serve as points of interest and codex entries.

Landmarks are selected per-biome from a pool:

**Starting Grove landmarks:**
- Ancient Well (structure)
- Guardian Oak Stump (prop)
- Keeper's Shrine (structure)

**Meadow landmarks:**
- Standing Stones (3 boulders in a circle, 3x3 tiles)
- Wildflower Arch (floral prop arrangement)
- Sunstone Monolith (single tall rock with golden moss)
- Fairy Ring (mushroom circle, 2x2 tiles)

**Ancient Forest landmarks:**
- Hollow Ancient Tree (massive stump, 2x2 tiles, harvestable once per season for 5 acorns)
- Overgrown Ruins (stone blocks with moss, 3x3 tiles)
- Luminous Pool (glowing water tile cluster)
- Spider Silk Grove (web props between trees)

**Wetlands landmarks:**
- Sunken Bridge (half-submerged path tiles)
- Heron's Perch (tall prop on water edge)
- Bog Garden (rare water plants, 2x2 tiles)
- Fog Altar (stone structure surrounded by water)

**Rocky Highlands landmarks:**
- Wind Spire (tall rock formation, 1x1)
- Cliff Overlook (edge-of-zone scenic point, grants minimap reveal of adjacent zones)
- Ore Vein (harvestable once per season for 3 timber + 2 acorns)
- Eagle Nest (high prop, decorative)

**Orchard Valley landmarks:**
- Abandoned Cottage (structure, 2x2 tiles)
- Bee Meadow (prop cluster, grants passive +5% fruit yield in zone)
- Heritage Tree (massive golden-apple wild tree, always stage 4)
- Cider Press (structure, converts 5 fruit to 50 coins when interacted)

**Frozen Peaks landmarks:**
- Ice Cave Entrance (2x2 tiles, decorative)
- Frozen Waterfall (water + rock props)
- Aurora Viewpoint (edge scenic point, +200 XP on first visit)
- Frost Crystal Cluster (harvestable once per season for 3 acorns)

**Twilight Glade landmarks:**
- Moonwell (glowing water, heals stamina to full on interaction, 1 use per day)
- Spirit Tree (stage 4 ghost-birch, permanent glow, drops 1 rare seed on first harvest)
- Ancient Portal (decorative stone circle, lore codex entry)
- Crystal Garden (crystal-oak and glow-mushroom arrangement)

### 4.4 Zone NPCs

NPCs are placed in zones based on biome type. Each zone gets 0-3 NPCs from a biome-appropriate pool. NPC placement uses the existing `NpcPlacement` system.

| Biome | NPC Count | NPC Types |
|-------|----------|-----------|
| Starting Grove | 1-2 | Elder (lore), Seed Merchant (seeds) |
| Meadow | 1-2 | Wanderer (tips), Botanist (species info) |
| Ancient Forest | 1-2 | Forester (quests), Hermit (lore) |
| Wetlands | 0-1 | Fisherman (tips), Herbalist (crafting) |
| Rocky Highlands | 0-1 | Prospector (quests), Ranger (tips) |
| Orchard Valley | 1-2 | Orchard Keeper (seeds), Merchant (trading) |
| Frozen Peaks | 0-1 | Mountaineer (lore), none |
| Twilight Glade | 1 | Spirit Guide (prestige lore + rare seeds) |

### 4.5 Rare Zones

Some zone slots are designated as **rare variants** of their biome. Rarity is determined by a seeded roll during world generation:

```
function isRareZone(rng: () => number): boolean {
  return rng() < 0.08;  // 8% chance per zone slot
}
```

Rare zones have:
- A unique name prefix: "Ancient", "Hidden", "Enchanted", "Forgotten", "Sacred"
- +50% vegetation density
- All wild trees start at stage 3 or 4 (instead of 2-4)
- A guaranteed unique landmark not found in normal zones
- 1 guaranteed NPC with a unique quest chain
- +25% XP bonus (stacks with biome bonus)
- A golden hex border on the world map

### 4.6 Codex Integration

The existing codex system (`codex.ts`, `speciesDiscovery.ts`) is extended with:

**Zone Codex Entries:** Each zone discovered adds an entry.

```typescript
interface ZoneCodexEntry {
  zoneId: string;
  zoneName: string;
  biomeId: string;
  discoveredOnDay: number;
  landmarkId: string | null;
  speciesFound: string[];    // species IDs of wild trees in this zone
  isRare: boolean;
}
```

**Biome Codex Entries:** Already exist in `BIOME_CODEX` in `codex.ts`. Discovery of a new biome unlocks the entry and reveals native species list.

**Landmark Codex Entries:** New codex category.

```typescript
interface LandmarkCodexEntry {
  landmarkId: string;
  name: string;
  description: string;      // flavor text
  biome: string;
  discoveredInZone: string;
  effect: string | null;     // gameplay effect description
}
```

---

## 5. Zone Persistence & Lifecycle

### 5.1 Save Format

Zone state is stored in the Zustand-compatible game store, keyed by zone ID.

```typescript
// Addition to gameStore state
interface GameStateData {
  // ... existing fields ...

  /** Per-zone persistent state */
  zoneStates: Record<string, ZoneStateSnapshot>;

  /** Generated world graph (zone definitions minus entity data) */
  worldGraph: WorldGraphData;

  /** Zone codex entries */
  zoneCodex: Record<string, ZoneCodexEntry>;

  /** Landmark codex entries */
  landmarkCodex: Record<string, LandmarkCodexEntry>;
}

interface ZoneStateSnapshot {
  zoneId: string;
  biomeId: string;
  savedAt: number;                     // Date.now() timestamp
  trees: SerializedTree[];             // player-planted trees
  wildTreeStates: SerializedWildTree[];// modified wild tree states
  modifiedTiles: { x: number; z: number; type: string }[];
  placedStructures: { templateId: string; x: number; z: number; rotation: number }[];
  regrowthTimers: RegrowthTimer[];
  harvestedLandmark: boolean;          // whether seasonal landmark harvest was claimed
  landmarkHarvestDay: number;          // last day landmark was harvested
}

interface SerializedWildTree {
  localX: number;
  localZ: number;
  speciesId: string;
  stage: number;
  harvested: boolean;
  removedAt: number | null;            // timestamp if harvested/destroyed
}

interface WorldGraphData {
  seed: string;
  radius: number;
  slots: WorldGraphSlot[];
}

interface WorldGraphSlot {
  q: number;
  r: number;
  populated: boolean;
  biomeId: string | null;
  zoneId: string | null;
  zoneName: string | null;
  isRare: boolean;
  connections: { direction: number; targetQ: number; targetR: number }[];
}
```

### 5.2 Offline Growth for Unvisited Zones

When the player re-enters a zone, trees in that zone receive offline growth based on `Date.now() - snapshot.savedAt`. The existing `calculateOfflineGrowth` function is reused.

**Rules:**
- Maximum offline growth: 24 hours (86,400 seconds) -- same as existing cap
- Season multiplier during offline: averaged to 1.0
- Water state resets to false (water evaporates while away)
- Wild trees also receive offline growth (they use the same formula)

### 5.3 Zone Aging

When a zone is not the active zone:

1. **Wild tree regrowth:** Harvested wild trees respawn after 7 in-game days (existing `wildTreeRegrowth` system). Timers tick based on game time, not real time.
2. **Seasonal changes:** When the player enters a zone in a different season than when they left, tree meshes rebuild with seasonal canopy colors (existing behavior).
3. **No degradation:** Player-planted trees never die or degrade while the player is away. This is a cozy game -- no punishment for not visiting.

### 5.4 Maximum Active Zones in Memory

| Data Type | In Memory | On Disk |
|-----------|----------|---------|
| Active zone ECS entities | 1 zone | -- |
| Pre-cached zone definitions | Up to 6 (neighbors) | -- |
| Zone state snapshots | All discovered zones | Persisted via game store |
| World graph | Always in memory | Persisted via game store |

**Memory budget:**
- Active zone ECS entities: ~50-200 entities = ~50 KB
- Pre-cached definitions: ~6 x 5 KB = ~30 KB
- Zone snapshots: ~50 zones x 2 KB avg = ~100 KB
- World graph: ~127 slots x 100 bytes = ~13 KB
- **Total: ~193 KB** (well within the 100 MB mobile budget)

---

## 6. Performance Constraints

### 6.1 Rendering Budget (Per Active Zone)

| Metric | Budget | Strategy |
|--------|--------|----------|
| Draw calls | < 50 | Instanced rendering for ground, props; individual meshes for trees/NPCs |
| Vertices | < 30,000 | PSX low-poly meshes, flat shading, chunky geometry |
| Textures | < 8 unique | Shared PBR atlas, biome-tinted via vertex colors |
| Entities | < 200 | Grid cells + trees + props + NPCs + structures |
| FPS (mobile) | >= 55 | One zone rendered at a time |
| FPS (desktop) | >= 60 | Same as mobile, higher resolution |

### 6.2 Vertex Budget Breakdown

| Element | Count | Verts Each | Total | Notes |
|---------|-------|-----------|-------|-------|
| Ground tiles | 144-196 | 4 | 576-784 | 12x12 to 14x14 flat quads |
| Trees (wild) | 15-35 | 200 | 3,000-7,000 | SPS procedural meshes |
| Trees (planted) | 0-20 | 200 | 0-4,000 | Same SPS meshes |
| Props | 5-15 | 50 | 250-750 | Simple box/cylinder |
| NPCs | 0-3 | 72 | 0-216 | Chibi box meshes |
| Structures | 0-3 | 100 | 0-300 | Block meshes |
| Landmark | 1 | 200 | 200 | Slightly more detailed |
| Border trees | 20-40 | 100 | 2,000-4,000 | Simplified distant trees |
| Sky/ground plane | 1 | 4 | 4 | Single quad |
| **Total** | | | **~6,000-17,000** | Well under 30K budget |

### 6.3 Zone Transition Performance

| Phase | Budget | Implementation |
|-------|--------|---------------|
| Fade out | 150ms | CSS opacity transition |
| Unload current zone | 50ms | `world.remove()` loop, dispose meshes |
| Generate/load zone | 50ms | Pure JS computation, no DOM/GPU |
| Load ECS entities | 50ms | `world.add()` loop |
| Build meshes | 100ms | Template cache hit = clone, cache miss = build |
| Fade in | 150ms | CSS opacity transition |
| **Total** | **<500ms** | |

The template mesh cache (existing `TreeMeshManager`) persists across zone transitions. A tree species+stage combination that was already built in a previous zone gets a `Mesh.clone()` instead of a full rebuild.

### 6.4 World Map UI Performance

The world map is pure SVG/React -- no WebGL. With 127 hex slots maximum, the SVG has ~127 polygon elements plus labels. This renders in <1ms on any device.

---

## 7. Extended Type Definitions

### 7.1 New Types (game/world/types.ts additions)

```typescript
export type BiomeId =
  | "starting-grove"
  | "meadow"
  | "ancient-forest"
  | "wetlands"
  | "rocky-highlands"
  | "orchard-valley"
  | "frozen-peaks"
  | "twilight-glade";

export type WaterFeatureType = "none" | "pond" | "stream" | "lake" | "river";

export interface HexCoord {
  q: number;
  r: number;
}

export interface WorldGraphSlot {
  coord: HexCoord;
  populated: boolean;
  biomeId: BiomeId | null;
  zoneId: string | null;
  zoneName: string | null;
  isRare: boolean;
  connections: HexCoord[];
}

export interface WorldGraph {
  seed: string;
  radius: number;
  playerLevel: number;
  prestigeCount: number;
  slots: Map<string, WorldGraphSlot>;  // key: `${q},${r}`
}

export interface LandmarkDef {
  id: string;
  name: string;
  description: string;
  biomePools: BiomeId[];
  size: { width: number; height: number };  // tile footprint
  effect: LandmarkEffect | null;
  props: PropPlacement[];                   // visual elements
  rarity: "common" | "rare";               // rare = only in rare zones
}

export type LandmarkEffect =
  | { type: "harvest"; resources: { type: string; amount: number }[]; cooldownDays: number }
  | { type: "stamina_heal"; amount: number; cooldownDays: number }
  | { type: "xp_bonus"; magnitude: number }                  // passive
  | { type: "yield_bonus"; resource: string; magnitude: number }  // passive
  | { type: "reveal"; revealAdjacentZones: boolean }
  | { type: "trade"; conversionIn: string; amountIn: number; conversionOut: string; amountOut: number };
```

### 7.2 Hex Math Utilities (game/utils/hexMath.ts)

```typescript
/** Distance between two hex coordinates. */
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const dq = q1 - q2;
  const dr = r1 - r2;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/** Get the 6 hex neighbors of a coordinate. */
export function hexNeighbors(q: number, r: number): HexCoord[] {
  return [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 },
  ];
}

/** Generate all hex coordinates within a given radius. */
export function hexRing(radius: number): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        coords.push({ q, r });
      }
    }
  }
  return coords;
}

/** Convert hex coordinate to a string key for Map lookups. */
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}
```

---

## 8. World Generation Algorithm (Full Pseudocode)

```
function generateWorldGraph(worldSeed, playerLevel, prestigeCount):
  rng = createRNG(hashString(worldSeed))
  radius = getWorldRadius(playerLevel)
  density = 0.55 + 0.10 * min(radius, 6)

  // 1. Generate all hex slots within radius
  allSlots = hexRing(radius)
  graph = new Map()

  // 2. Mark center as Starting Grove (always populated)
  graph.set("0,0", {
    coord: { q: 0, r: 0 },
    populated: true,
    biomeId: "starting-grove",
    zoneId: "starting-grove",
    zoneName: "Starting Grove",
    isRare: false,
    connections: [],
  })

  // 3. Populate remaining slots
  for each slot in allSlots (excluding center):
    roll = rng()
    if roll < density:
      biome = assignBiome(slot.q, slot.r, worldSeed, playerLevel)
      // Skip twilight-glade if no prestige
      if biome == "twilight-glade" and prestigeCount < 1:
        biome = "ancient-forest"  // fallback
      rare = isRareZone(rng)
      name = generateZoneName(biome, rng, rare)
      zoneId = `zone-${slot.q}-${slot.r}`
      graph.set(hexKey(slot.q, slot.r), {
        populated: true, biomeId: biome, zoneId, zoneName: name,
        isRare: rare, connections: [],
      })
    else:
      graph.set(hexKey(slot.q, slot.r), {
        populated: false, biomeId: null, zoneId: null, zoneName: null,
        isRare: false, connections: [],
      })

  // 4. Build connections (edges between populated neighbors)
  for each populated slot in graph:
    for each neighbor of slot:
      neighborSlot = graph.get(hexKey(neighbor.q, neighbor.r))
      if neighborSlot and neighborSlot.populated:
        slot.connections.push(neighbor)

  // 5. Validate connectivity (BFS from center)
  visited = BFS(graph, "0,0")
  unreachable = populated slots NOT in visited

  // 6. Fix connectivity by adding bridge slots
  for each unreachable slot:
    // Find nearest visited slot
    nearest = findNearestVisited(unreachable, visited)
    // Populate one intermediate slot to create a path
    midpoint = hexMidpoint(unreachable.coord, nearest.coord)
    if graph.get(hexKey(midpoint)) and not graph.get(hexKey(midpoint)).populated:
      graph.get(hexKey(midpoint)).populated = true
      graph.get(hexKey(midpoint)).biomeId = "meadow"  // safe bridge biome
      // Rebuild connections for affected slots
      rebuildLocalConnections(graph, midpoint)

  return { seed: worldSeed, radius, slots: graph }
```

### 8.1 Zone Name Generation

Zone names are generated from biome-specific word pools:

```typescript
const ZONE_NAME_POOLS: Record<BiomeId, { prefix: string[]; suffix: string[] }> = {
  "starting-grove": {
    prefix: ["Home", "Keeper's", "First"],
    suffix: ["Grove", "Garden", "Clearing"],
  },
  "meadow": {
    prefix: ["Sunlit", "Windswept", "Golden", "Dewdrop", "Clover"],
    suffix: ["Meadow", "Field", "Expanse", "Pasture", "Lea"],
  },
  "ancient-forest": {
    prefix: ["Ancient", "Shadowed", "Mossy", "Whispering", "Deep"],
    suffix: ["Forest", "Woods", "Thicket", "Timberland", "Canopy"],
  },
  "wetlands": {
    prefix: ["Misty", "Foggy", "Murky", "Emerald", "Still"],
    suffix: ["Wetlands", "Marsh", "Bog", "Fen", "Hollow"],
  },
  "rocky-highlands": {
    prefix: ["Stony", "Windswept", "Iron", "Craggy", "Eagle's"],
    suffix: ["Highlands", "Ridge", "Bluff", "Crest", "Pinnacle"],
  },
  "orchard-valley": {
    prefix: ["Bountiful", "Golden", "Sweet", "Sunny", "Harvest"],
    suffix: ["Valley", "Orchard", "Grove", "Dell", "Glen"],
  },
  "frozen-peaks": {
    prefix: ["Frozen", "Glacial", "Crystal", "Frostbitten", "Silent"],
    suffix: ["Peak", "Summit", "Tundra", "Expanse", "Crag"],
  },
  "twilight-glade": {
    prefix: ["Twilight", "Moonlit", "Ethereal", "Enchanted", "Starlit"],
    suffix: ["Glade", "Sanctuary", "Hollow", "Clearing", "Grove"],
  },
};

// Rare zones get special prefixes
const RARE_PREFIXES = ["Hidden", "Sacred", "Forgotten", "Ancient", "Enchanted"];
```

Name generation: `pickRandom(rng, prefixes) + " " + pickRandom(rng, suffixes)`. Rare zones replace the normal prefix with one from `RARE_PREFIXES`.

---

## 9. Config JSON Schemas

### 9.1 config/world/biomes.json

```json
{
  "$schema": "biomes-schema",
  "biomes": [
    {
      "id": "starting-grove",
      "name": "Starting Grove",
      "zoneType": "grove",
      "sizeRange": [14, 14],
      "groundMaterial": "soil",
      "terrain": {
        "heightAmplitude": 0.5,
        "heightFrequency": 0.02,
        "flatRadius": 8
      },
      "tileRules": {
        "waterPct": 0.04,
        "rockPct": 0.03,
        "pathPct": 0.05
      },
      "waterFeature": {
        "type": "pond",
        "probability": 1.0,
        "sizeRange": [3, 5]
      },
      "vegetation": {
        "wildTreeDensity": 0,
        "wildTrees": [],
        "propDensity": 0.03,
        "props": [
          { "id": "wild-flowers", "weight": 4 },
          { "id": "mushroom-cluster", "weight": 1 },
          { "id": "stump", "weight": 1 }
        ]
      },
      "colors": {
        "groundPrimary": "#4a7c3f",
        "groundSecondary": "#5a8c4f",
        "fog": "#c8e6c8",
        "ambientLight": "#ffe8c8"
      },
      "bonuses": [
        { "type": "growth_boost", "magnitude": 0.15 }
      ],
      "plantable": true,
      "difficulty": 1,
      "minLevel": 1
    }
  ]
}
```

### 9.2 config/world/landmarks.json

```json
{
  "landmarks": [
    {
      "id": "standing-stones",
      "name": "Standing Stones",
      "description": "Three ancient stones arranged in a circle, humming with faint energy.",
      "biomePools": ["meadow"],
      "size": { "width": 3, "height": 3 },
      "effect": { "type": "xp_bonus", "magnitude": 0.05 },
      "props": [
        { "propId": "boulder", "localX": 0, "localZ": 0, "scale": 1.5 },
        { "propId": "boulder", "localX": 2, "localZ": 0, "scale": 1.5 },
        { "propId": "boulder", "localX": 1, "localZ": 2, "scale": 1.5 },
        { "propId": "moss-patch", "localX": 1, "localZ": 1 }
      ],
      "rarity": "common"
    },
    {
      "id": "hollow-ancient-tree",
      "name": "Hollow Ancient Tree",
      "description": "A massive hollow stump, wide enough to stand inside. Acorns collect in its basin each season.",
      "biomePools": ["ancient-forest"],
      "size": { "width": 2, "height": 2 },
      "effect": {
        "type": "harvest",
        "resources": [{ "type": "acorns", "amount": 5 }],
        "cooldownDays": 30
      },
      "props": [
        { "propId": "ancient-stump", "localX": 0, "localZ": 0, "scale": 2.0 }
      ],
      "rarity": "common"
    },
    {
      "id": "moonwell",
      "name": "Moonwell",
      "description": "A pool of silvery water that glows faintly. Drinking from it restores your energy.",
      "biomePools": ["twilight-glade"],
      "size": { "width": 2, "height": 2 },
      "effect": {
        "type": "stamina_heal",
        "amount": 100,
        "cooldownDays": 1
      },
      "props": [
        { "propId": "glow-water", "localX": 0, "localZ": 0 },
        { "propId": "glow-water", "localX": 1, "localZ": 0 },
        { "propId": "glow-water", "localX": 0, "localZ": 1 },
        { "propId": "glow-water", "localX": 1, "localZ": 1 }
      ],
      "rarity": "common"
    },
    {
      "id": "cider-press",
      "name": "Cider Press",
      "description": "An old mechanical press. Insert fruit to produce valuable cider.",
      "biomePools": ["orchard-valley"],
      "size": { "width": 1, "height": 1 },
      "effect": {
        "type": "trade",
        "conversionIn": "fruit",
        "amountIn": 5,
        "conversionOut": "coins",
        "amountOut": 50
      },
      "props": [
        { "propId": "cider-press", "localX": 0, "localZ": 0 }
      ],
      "rarity": "common"
    }
  ]
}
```

### 9.3 config/world/zoneNames.json

```json
{
  "starting-grove": {
    "prefix": ["Home", "Keeper's", "First"],
    "suffix": ["Grove", "Garden", "Clearing"]
  },
  "meadow": {
    "prefix": ["Sunlit", "Windswept", "Golden", "Dewdrop", "Clover"],
    "suffix": ["Meadow", "Field", "Expanse", "Pasture", "Lea"]
  },
  "ancient-forest": {
    "prefix": ["Ancient", "Shadowed", "Mossy", "Whispering", "Deep"],
    "suffix": ["Forest", "Woods", "Thicket", "Timberland", "Canopy"]
  },
  "wetlands": {
    "prefix": ["Misty", "Foggy", "Murky", "Emerald", "Still"],
    "suffix": ["Wetlands", "Marsh", "Bog", "Fen", "Hollow"]
  },
  "rocky-highlands": {
    "prefix": ["Stony", "Windswept", "Iron", "Craggy", "Eagle's"],
    "suffix": ["Highlands", "Ridge", "Bluff", "Crest", "Pinnacle"]
  },
  "orchard-valley": {
    "prefix": ["Bountiful", "Golden", "Sweet", "Sunny", "Harvest"],
    "suffix": ["Valley", "Orchard", "Grove", "Dell", "Glen"]
  },
  "frozen-peaks": {
    "prefix": ["Frozen", "Glacial", "Crystal", "Frostbitten", "Silent"],
    "suffix": ["Peak", "Summit", "Tundra", "Expanse", "Crag"]
  },
  "twilight-glade": {
    "prefix": ["Twilight", "Moonlit", "Ethereal", "Enchanted", "Starlit"],
    "suffix": ["Glade", "Sanctuary", "Hollow", "Clearing", "Grove"]
  },
  "rarePrefixes": ["Hidden", "Sacred", "Forgotten", "Ancient", "Enchanted"]
}
```

---

## 10. World Map ASCII Diagram

### 10.1 Example World (Radius 3, Level 12)

```
                      [FRZ]
                    /       \
              [RCK]           [ANC]
            /       \       /       \
      [   ]           [WET]           [   ]
    /       \       /       \       /       \
[   ]         [MEA]           [ORC]           [   ]
    \       /       \       /       \       /
      [ANC]           [GRV]           [MEA]
    /       \       /   |   \       /       \
[WET]         [ORC]     |     [ANC]           [   ]
    \       /       \   |   /       \       /
      [   ]           [MEA]           [RCK]
    /       \       /       \       /       \
[   ]         [   ]           [WET]           [   ]
    \       /       \       /       \       /
      [   ]           [   ]           [   ]
                    \       /
                      [   ]

Legend:
  [GRV] = Starting Grove (center, 0,0)
  [MEA] = Meadow
  [ANC] = Ancient Forest
  [WET] = Wetlands
  [RCK] = Rocky Highlands
  [ORC] = Orchard Valley
  [FRZ] = Frozen Peaks
  [   ] = Unpopulated (impassable wilderness)
```

### 10.2 Zone Internal Layout (Ancient Forest, 10x10)

```
+----+----+----+----+----+----+----+----+----+----+
| .  | .  | .  | .  |EXIT| .  | .  | .  | .  | .  |  EXIT = North connection
+----+----+----+----+----+----+----+----+----+----+
| .  | T  | .  | .  | PP | .  | T  | .  | .  | .  |  T = Wild tree
+----+----+----+----+----+----+----+----+----+----+
| .  | .  | RR | .  | .  | .  | .  | T  | .  | .  |  RR = Rock
+----+----+----+----+----+----+----+----+----+----+
| .  | T  | .  | T  | .  | .  | .  | .  | T  | .  |  PP = Path
+----+----+----+----+----+----+----+----+----+----+
|EXIT| PP | PP | PP | PP | .  | LL | LL | .  |EXIT|  LL = Landmark (2x2)
+----+----+----+----+----+----+----+----+----+----+
| .  | .  | .  | PP | .  | .  | LL | LL | .  | .  |  WW = Water
+----+----+----+----+----+----+----+----+----+----+
| .  | T  | .  | PP | .  | WW | WW | .  | .  | .  |  NP = NPC
+----+----+----+----+----+----+----+----+----+----+
| .  | .  | .  | PP | .  | WW | .  | .  | T  | .  |  .  = Soil (plantable/empty)
+----+----+----+----+----+----+----+----+----+----+
| .  | .  | NP | .  | PP | .  | .  | T  | .  | .  |
+----+----+----+----+----+----+----+----+----+----+
| .  | .  | .  | .  |EXIT| .  | .  | .  | .  | .  |
+----+----+----+----+----+----+----+----+----+----+
```

---

## 11. File List with Line Estimates

### New Files

| File | Lines | Description |
|------|-------|-------------|
| `game/world/WorldGraph.ts` | ~250 | World graph generation (hex grid, biome assignment, connectivity) |
| `game/world/WorldGraph.test.ts` | ~200 | Tests for world graph generation |
| `game/world/BiomeArchetypes.ts` | ~300 | Biome archetype definitions (8 biomes) |
| `game/world/BiomeArchetypes.test.ts` | ~100 | Tests for biome archetypes |
| `game/world/LandmarkPlacer.ts` | ~150 | Landmark selection and placement |
| `game/world/LandmarkPlacer.test.ts` | ~100 | Tests for landmark placement |
| `game/world/ZoneNameGenerator.ts` | ~80 | Procedural zone name generation |
| `game/world/ZoneNameGenerator.test.ts` | ~60 | Tests for name generation |
| `game/world/WaterFeatureGenerator.ts` | ~120 | Water feature placement (pond/stream/lake/river) |
| `game/world/WaterFeatureGenerator.test.ts` | ~80 | Tests for water features |
| `game/world/ZoneStateManager.ts` | ~200 | Zone state save/restore (snapshot, offline growth) |
| `game/world/ZoneStateManager.test.ts` | ~150 | Tests for zone state management |
| `game/world/ZoneTransition.ts` | ~100 | Zone transition orchestration (fade, unload, load, fade) |
| `game/world/ZoneTransition.test.ts` | ~80 | Tests for zone transitions |
| `game/utils/hexMath.ts` | ~60 | Hex coordinate math utilities |
| `game/utils/hexMath.test.ts` | ~80 | Tests for hex math |
| `game/ui/WorldMap.tsx` | ~350 | World map overlay (SVG hex grid, zoom, selection) |
| `game/ui/WorldMap.test.tsx` | ~100 | Tests for world map UI |
| `game/ui/ZoneTransitionOverlay.tsx` | ~40 | Fade-to-black CSS overlay |
| `config/world/biomes.json` | ~250 | Biome archetype definitions (data) |
| `config/world/landmarks.json` | ~300 | Landmark definitions (data) |
| `config/world/zoneNames.json` | ~60 | Zone name word pools (data) |

### Modified Files

| File | Changes | Description |
|------|---------|-------------|
| `game/world/types.ts` | +50 lines | Add BiomeId, HexCoord, WorldGraph, LandmarkDef types |
| `game/world/WorldGenerator.ts` | +80 lines | Integrate BiomeArchetypes, landmarks, water features |
| `game/world/ZoneLoader.ts` | +40 lines | Support landmark entities, zone state restoration |
| `game/world/archetypes.ts` | +100 lines | Add 3 new biome archetypes (wetlands, frozen-peaks, twilight-glade) |
| `game/stores/gameStore.ts` | +80 lines | Add zoneStates, worldGraph, zoneCodex, landmarkCodex state + actions |
| `game/systems/discovery.ts` | +30 lines | Add biome discovery, landmark discovery functions |
| `game/systems/zoneBonuses.ts` | +20 lines | Add new zone type bonuses for new biomes |
| `game/ecs/world.ts` | +10 lines | Add landmark component + query |
| `game/constants/codex.ts` | +60 lines | Add zone codex, landmark codex entries |
| `game/ui/HUD.tsx` | +15 lines | Add MAP button |
| `game/ui/GameUI.tsx` | +10 lines | Integrate WorldMap overlay |

### Line Totals

| Category | New Lines | Modified Lines | Total |
|----------|----------|---------------|-------|
| Core world systems | ~1,340 | ~380 | ~1,720 |
| Tests | ~950 | 0 | ~950 |
| UI components | ~490 | ~25 | ~515 |
| Config data | ~610 | 0 | ~610 |
| **Grand Total** | **~3,390** | **~405** | **~3,795** |

---

## 12. Implementation Priority

### Phase 1: World Graph + Biomes (estimated: 2-3 days)

1. `hexMath.ts` + tests
2. `BiomeArchetypes.ts` + biomes.json
3. `WorldGraph.ts` + tests (generation, connectivity validation)
4. `ZoneNameGenerator.ts` + zoneNames.json
5. Update `types.ts` with new types
6. Update `gameStore.ts` with worldGraph state

### Phase 2: Zone Generation Upgrades (estimated: 2-3 days)

1. `WaterFeatureGenerator.ts` + tests
2. `LandmarkPlacer.ts` + landmarks.json + tests
3. Update `WorldGenerator.ts` to use BiomeArchetypes
4. Update `ZoneLoader.ts` for landmarks
5. Update `archetypes.ts` with new biomes
6. Path connectivity guarantee algorithm

### Phase 3: Zone Persistence + Transitions (estimated: 2-3 days)

1. `ZoneStateManager.ts` + tests (save/restore snapshots)
2. `ZoneTransition.ts` + tests (orchestration)
3. `ZoneTransitionOverlay.tsx` (CSS fade)
4. Integrate offline growth for zone snapshots
5. Pre-loading of adjacent zone definitions
6. Update `gameStore.ts` with zoneStates

### Phase 4: World Map UI (estimated: 1-2 days)

1. `WorldMap.tsx` (SVG hex grid, fog of war, selection)
2. `WorldMap.test.tsx`
3. HUD integration (MAP button)
4. Travel mechanism (walk-to-edge prompt, map travel)

### Phase 5: Exploration Rewards (estimated: 1-2 days)

1. Update `discovery.ts` with biome/landmark discovery
2. Update `codex.ts` with zone/landmark codex entries
3. Biome-exclusive species seed drops
4. Rare zone generation + rewards
5. Exploration achievements
6. Ring completion bonuses

**Total estimated implementation time: 8-13 days**

---

## 13. Migration from Current World System

The current `starting-world.json` (10 hand-authored zones) continues to work as-is for players with existing saves. The open world system activates when:

1. **New game:** `generateWorldGraph()` creates the full hex world. The Starting Grove zone from `starting-world.json` is used as the `(0,0)` slot. Adjacent hand-authored zones (forest-trail, sunlit-clearing, mossy-hollow, north-woods, village-path, ferndale-village, orchard-trail, ancient-forest, mushroom-grotto) are placed in ring 1-2 slots.

2. **Existing save:** On first load after the update, the system generates a world graph around the existing zones. Already-discovered zones are marked as discovered in the new graph. New procedural zones fill the remaining slots.

3. **Prestige:** On prestige, a completely new world graph is generated with the new world seed. Twilight Glade zones become available if `prestigeCount >= 1`.

The `starting-world.json` zones act as a "curated core" at the world center, ensuring every player's first few zones feel hand-crafted. The procedural system takes over for zones beyond ring 2.
