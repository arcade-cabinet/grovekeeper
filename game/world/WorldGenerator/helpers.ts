import type { ZoneArchetype } from "../archetypes.ts";
import type { ConnectionDirection } from "../types.ts";

/** Pick a random item from a weighted list. */
export function pickWeighted<T>(rng: () => number, items: { value: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Roll an integer in [min, max] inclusive. */
export function rollInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Opposite direction for bidirectional connections. */
export function oppositeDirection(dir: ConnectionDirection): ConnectionDirection {
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

export function getZoneCount(playerLevel: number, rng: () => number): number {
  if (playerLevel < 5) return 1;
  if (playerLevel < 10) return 3;
  if (playerLevel < 15) return 5;
  if (playerLevel < 20) return 7;
  return rollInt(rng, 8, 12);
}

export function getAvailableArchetypes(
  archetypes: ZoneArchetype[],
  playerLevel: number,
): { value: ZoneArchetype; weight: number }[] {
  const result: { value: ZoneArchetype; weight: number }[] = [];

  for (const arch of archetypes) {
    switch (arch.id) {
      case "grove":
        result.push({ value: arch, weight: 3 });
        break;
      case "clearing":
        if (playerLevel >= 5) result.push({ value: arch, weight: 2 });
        break;
      case "trail":
        if (playerLevel >= 5) result.push({ value: arch, weight: 2 });
        break;
      case "wild-forest":
        if (playerLevel >= 10) result.push({ value: arch, weight: 2 });
        break;
      case "settlement":
        if (playerLevel >= 15) result.push({ value: arch, weight: 1 });
        break;
    }
  }

  return result;
}
