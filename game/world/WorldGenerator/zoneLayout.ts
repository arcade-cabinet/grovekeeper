import type { ZoneArchetype } from "../archetypes.ts";
import type { ConnectionDirection, ZoneConnection, ZoneDefinition } from "../types.ts";
import { oppositeDirection } from "./helpers";
import { generateProps, generateTileOverrides } from "./tileGeneration";

export interface OpenEdge {
  zoneId: string;
  direction: ConnectionDirection;
  origin: { x: number; z: number };
  size: { width: number; height: number };
}

export function getOpenEdges(zone: ZoneDefinition, usedDirections: Set<string>): OpenEdge[] {
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

export function computeNewOrigin(
  edge: OpenEdge,
  newWidth: number,
  newHeight: number,
  rng: () => number,
): { x: number; z: number } {
  const gap = 1;
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

export function createConnectionPair(
  fromZone: ZoneDefinition,
  toZone: ZoneDefinition,
  direction: ConnectionDirection,
): { fromConn: ZoneConnection; toConn: ZoneConnection } {
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

export function createZoneFromArchetype(
  rng: () => number,
  archetype: ZoneArchetype,
  zoneId: string,
  origin: { x: number; z: number },
  size: { width: number; height: number },
): ZoneDefinition {
  const tiles = generateTileOverrides(rng, size.width, size.height, archetype.tileRules);

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
