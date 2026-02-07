/**
 * WorldGenerator -- Procedurally generates worlds from zone archetypes.
 *
 * Uses a seeded RNG for deterministic generation. World complexity
 * scales with player level. Prestige unlocks enchanted biome zones.
 */

import { createRNG, hashString } from "../utils/seedRNG";
import { ZONE_ARCHETYPES, type ZoneArchetype } from "./archetypes";
import type {
  ConnectionDirection,
  PropPlacement,
  TileOverrideDef,
  WorldDefinition,
  ZoneConnection,
  ZoneDefinition,
} from "./types";

// ============================================
// Helpers
// ============================================

/** Pick a random item from a weighted list. */
export function pickWeighted<T>(
  rng: () => number,
  items: { value: T; weight: number }[],
): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Roll an integer in [min, max] inclusive. */
function rollInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Opposite direction for bidirectional connections. */
function oppositeDirection(dir: ConnectionDirection): ConnectionDirection {
  switch (dir) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "east":
      return "west";
    case "west":
      return "east";
  }
}

// ============================================
// Zone count by level
// ============================================

function getZoneCount(playerLevel: number, rng: () => number): number {
  if (playerLevel < 5) return 1;
  if (playerLevel < 10) return 3;
  if (playerLevel < 15) return 5;
  if (playerLevel < 20) return 7;
  return rollInt(rng, 8, 12);
}

// ============================================
// Archetype selection by level
// ============================================

function getAvailableArchetypes(playerLevel: number): { value: ZoneArchetype; weight: number }[] {
  const archetypes: { value: ZoneArchetype; weight: number }[] = [];

  for (const arch of ZONE_ARCHETYPES) {
    switch (arch.id) {
      case "grove":
        archetypes.push({ value: arch, weight: 3 });
        break;
      case "clearing":
        if (playerLevel >= 5) archetypes.push({ value: arch, weight: 2 });
        break;
      case "trail":
        if (playerLevel >= 5) archetypes.push({ value: arch, weight: 2 });
        break;
      case "wild-forest":
        if (playerLevel >= 10) archetypes.push({ value: arch, weight: 2 });
        break;
      case "settlement":
        if (playerLevel >= 15) archetypes.push({ value: arch, weight: 1 });
        break;
    }
  }

  return archetypes;
}

// ============================================
// Tile override generation
// ============================================

function generateTileOverrides(
  rng: () => number,
  width: number,
  height: number,
  tileRules: { waterPct: number; rockPct: number; pathPct: number },
): TileOverrideDef[] {
  const tiles: TileOverrideDef[] = [];
  const totalTiles = width * height;

  const waterCount = Math.round(totalTiles * tileRules.waterPct);
  const rockCount = Math.round(totalTiles * tileRules.rockPct);
  const pathCount = Math.round(totalTiles * tileRules.pathPct);

  // Build a shuffled list of all tile positions
  const positions: { x: number; z: number }[] = [];
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      positions.push({ x, z });
    }
  }

  // Fisher-Yates shuffle with the seeded RNG
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let idx = 0;

  for (let i = 0; i < waterCount && idx < positions.length; i++, idx++) {
    tiles.push({ x: positions[idx].x, z: positions[idx].z, type: "water" });
  }
  for (let i = 0; i < rockCount && idx < positions.length; i++, idx++) {
    tiles.push({ x: positions[idx].x, z: positions[idx].z, type: "rock" });
  }
  for (let i = 0; i < pathCount && idx < positions.length; i++, idx++) {
    tiles.push({ x: positions[idx].x, z: positions[idx].z, type: "path" });
  }

  return tiles;
}

// ============================================
// Prop generation
// ============================================

function generateProps(
  rng: () => number,
  width: number,
  height: number,
  propDensity: number,
  possibleProps: { value: string; weight: number }[],
  occupiedTiles: Set<string>,
): PropPlacement[] {
  if (possibleProps.length === 0 || propDensity <= 0) return [];

  const props: PropPlacement[] = [];
  const totalTiles = width * height;
  const propCount = Math.round(totalTiles * propDensity);

  for (let i = 0; i < propCount; i++) {
    const x = Math.floor(rng() * width);
    const z = Math.floor(rng() * height);
    const key = `${x},${z}`;

    // Skip tiles already occupied by overrides or other props
    if (occupiedTiles.has(key)) continue;

    const propId = pickWeighted(rng, possibleProps);
    props.push({ propId, localX: x, localZ: z });
    occupiedTiles.add(key);
  }

  return props;
}

// ============================================
// Open edge tracking for zone placement
// ============================================

interface OpenEdge {
  zoneId: string;
  direction: ConnectionDirection;
  origin: { x: number; z: number };
  size: { width: number; height: number };
}

function getOpenEdges(zone: ZoneDefinition, usedDirections: Set<string>): OpenEdge[] {
  const edges: OpenEdge[] = [];
  const directions: ConnectionDirection[] = ["north", "south", "east", "west"];

  for (const dir of directions) {
    const key = `${zone.id}-${dir}`;
    if (usedDirections.has(key)) continue;
    edges.push({
      zoneId: zone.id,
      direction: dir,
      origin: zone.origin,
      size: zone.size,
    });
  }

  return edges;
}

function computeNewOrigin(
  edge: OpenEdge,
  newWidth: number,
  newHeight: number,
  rng: () => number,
): { x: number; z: number } {
  const gap = 1; // 1-tile gap between zones
  const { origin, size } = edge;

  switch (edge.direction) {
    case "east":
      return {
        x: origin.x + size.width + gap,
        z: origin.z + Math.floor(rng() * Math.max(1, size.height - newHeight + 1)),
      };
    case "west":
      return {
        x: origin.x - newWidth - gap,
        z: origin.z + Math.floor(rng() * Math.max(1, size.height - newHeight + 1)),
      };
    case "south":
      return {
        x: origin.x + Math.floor(rng() * Math.max(1, size.width - newWidth + 1)),
        z: origin.z + size.height + gap,
      };
    case "north":
      return {
        x: origin.x + Math.floor(rng() * Math.max(1, size.width - newWidth + 1)),
        z: origin.z - newHeight - gap,
      };
  }
}

function createConnectionPair(
  fromZone: ZoneDefinition,
  toZone: ZoneDefinition,
  direction: ConnectionDirection,
): { fromConn: ZoneConnection; toConn: ZoneConnection } {
  // Entry points are at the midpoint of the shared edge
  const fromEntry = getEdgeEntry(fromZone.size, direction);
  const toEntry = getEdgeEntry(toZone.size, oppositeDirection(direction));

  return {
    fromConn: {
      direction,
      targetZoneId: toZone.id,
      localEntry: fromEntry,
    },
    toConn: {
      direction: oppositeDirection(direction),
      targetZoneId: fromZone.id,
      localEntry: toEntry,
    },
  };
}

function getEdgeEntry(
  size: { width: number; height: number },
  direction: ConnectionDirection,
): { x: number; z: number } {
  switch (direction) {
    case "north":
      return { x: Math.floor(size.width / 2), z: 0 };
    case "south":
      return { x: Math.floor(size.width / 2), z: size.height - 1 };
    case "east":
      return { x: size.width - 1, z: Math.floor(size.height / 2) };
    case "west":
      return { x: 0, z: Math.floor(size.height / 2) };
  }
}

// ============================================
// Main generator
// ============================================

export function generateWorld(
  seed: string,
  playerLevel: number,
  _prestigeCount?: number,
): WorldDefinition {
  const rng = createRNG(hashString(seed));
  const zoneCount = getZoneCount(playerLevel, rng);

  const zones: ZoneDefinition[] = [];
  const usedDirections = new Set<string>();

  // Step 1: Create the starting grove
  const startingGrove = createZoneFromArchetype(
    rng,
    ZONE_ARCHETYPES[0], // grove archetype
    "zone-0",
    { x: 0, z: 0 },
    { width: 12, height: 12 }, // Fixed 12x12 for starting grove
  );
  zones.push(startingGrove);

  // Step 2: Add additional zones
  for (let i = 1; i < zoneCount; i++) {
    const available = getAvailableArchetypes(playerLevel);
    const archetype = pickWeighted(rng, available);

    const width = rollInt(rng, archetype.sizeRange.minWidth, archetype.sizeRange.maxWidth);
    const height = rollInt(rng, archetype.sizeRange.minHeight, archetype.sizeRange.maxHeight);

    // Collect all open edges from all placed zones
    const allEdges: OpenEdge[] = [];
    for (const zone of zones) {
      allEdges.push(...getOpenEdges(zone, usedDirections));
    }

    if (allEdges.length === 0) break;

    // Pick a random open edge
    const edgeIdx = Math.floor(rng() * allEdges.length);
    const edge = allEdges[edgeIdx];

    const newOrigin = computeNewOrigin(edge, width, height, rng);
    const zoneId = `zone-${i}`;

    const newZone = createZoneFromArchetype(rng, archetype, zoneId, newOrigin, {
      width,
      height,
    });
    zones.push(newZone);

    // Create bidirectional connections
    const parentZone = zones.find((z) => z.id === edge.zoneId);
    if (parentZone) {
      const { fromConn, toConn } = createConnectionPair(
        parentZone,
        newZone,
        edge.direction,
      );
      parentZone.connections.push(fromConn);
      newZone.connections.push(toConn);
    }

    // Mark these directions as used
    usedDirections.add(`${edge.zoneId}-${edge.direction}`);
    usedDirections.add(`${zoneId}-${oppositeDirection(edge.direction)}`);
  }

  // Player spawn at center of the starting grove
  const spawnX = Math.floor(startingGrove.size.width / 2);
  const spawnZ = Math.floor(startingGrove.size.height / 2);

  return {
    id: `world-${seed}`,
    name: `Grovekeeper World`,
    version: 1,
    zones,
    playerSpawn: { zoneId: startingGrove.id, localX: spawnX, localZ: spawnZ },
  };
}

// ============================================
// Zone factory
// ============================================

function createZoneFromArchetype(
  rng: () => number,
  archetype: ZoneArchetype,
  zoneId: string,
  origin: { x: number; z: number },
  size: { width: number; height: number },
): ZoneDefinition {
  const tiles = generateTileOverrides(rng, size.width, size.height, archetype.tileRules);

  // Build a set of occupied tile keys (from overrides) for prop placement
  const occupiedTiles = new Set<string>();
  for (const tile of tiles) {
    occupiedTiles.add(`${tile.x},${tile.z}`);
  }

  const props = generateProps(
    rng,
    size.width,
    size.height,
    archetype.propDensity ?? 0,
    archetype.possibleProps,
    occupiedTiles,
  );

  const hasWildTrees = archetype.wildTrees && archetype.wildTrees.length > 0;

  return {
    id: zoneId,
    name: archetype.name,
    type: archetype.type,
    origin,
    size,
    groundMaterial: archetype.groundMaterial,
    tiles: tiles.length > 0 ? tiles : undefined,
    props: props.length > 0 ? props : undefined,
    plantable: archetype.plantable,
    connections: [],
    wildTrees: hasWildTrees ? archetype.wildTrees : undefined,
    wildTreeDensity: hasWildTrees ? (archetype.wildTreeDensity ?? 0) : undefined,
  };
}
