import { createRNG, hashString } from "@/game/utils/seedRNG";
import { ZONE_ARCHETYPES } from "../archetypes.ts";
import type { WorldDefinition, ZoneDefinition } from "../types.ts";
import { computeBirmotherSpawn } from "./birchmother.ts";
import {
  getAvailableArchetypes,
  getZoneCount,
  oppositeDirection,
  pickWeighted,
  rollInt,
} from "./helpers.ts";
import { createConnectionPair, createZoneFromArchetype, getOpenEdges } from "./zoneLayout.ts";

export { BIRCHMOTHER_DISTANCE, computeBirmotherSpawn } from "./birchmother.ts";
export { pickWeighted } from "./helpers.ts";

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
    const available = getAvailableArchetypes(ZONE_ARCHETYPES, playerLevel);
    const archetype = pickWeighted(rng, available);

    const width = rollInt(rng, archetype.sizeRange.minWidth, archetype.sizeRange.maxWidth);
    const height = rollInt(rng, archetype.sizeRange.minHeight, archetype.sizeRange.maxHeight);

    const allEdges = zones.flatMap((zone) => getOpenEdges(zone, usedDirections));

    if (allEdges.length === 0) break;

    const edgeIdx = Math.floor(rng() * allEdges.length);
    const edge = allEdges[edgeIdx];

    const newOrigin = (() => {
      const gap = 1;
      const { origin, size } = edge;
      switch (edge.direction) {
        case "east":
          return {
            x: origin.x + size.width + gap,
            z: origin.z + Math.floor(rng() * Math.max(1, size.height - height + 1)),
          };
        case "west":
          return {
            x: origin.x - width - gap,
            z: origin.z + Math.floor(rng() * Math.max(1, size.height - height + 1)),
          };
        case "south":
          return {
            x: origin.x + Math.floor(rng() * Math.max(1, size.width - width + 1)),
            z: origin.z + size.height + gap,
          };
        case "north":
          return {
            x: origin.x + Math.floor(rng() * Math.max(1, size.width - width + 1)),
            z: origin.z - height - gap,
          };
      }
    })();

    const zoneId = `zone-${i}`;
    const newZone = createZoneFromArchetype(rng, archetype, zoneId, newOrigin, { width, height });
    zones.push(newZone);

    const parentZone = zones.find((z) => z.id === edge.zoneId);
    if (parentZone) {
      const { fromConn, toConn } = createConnectionPair(parentZone, newZone, edge.direction);
      parentZone.connections.push(fromConn);
      newZone.connections.push(toConn);
    }

    usedDirections.add(`${edge.zoneId}-${edge.direction}`);
    usedDirections.add(`${zoneId}-${oppositeDirection(edge.direction)}`);
  }

  const spawnX = Math.floor(startingGrove.size.width / 2);
  const spawnZ = Math.floor(startingGrove.size.height / 2);

  return {
    id: `world-${seed}`,
    name: `Grovekeeper World`,
    version: 1,
    zones,
    playerSpawn: { zoneId: startingGrove.id, localX: spawnX, localZ: spawnZ },
    birmotherSpawn: computeBirmotherSpawn(seed),
  };
}
