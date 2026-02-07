/**
 * Discovery system -- tracks which zones the player has visited.
 * Pure functions, no side effects.
 */

export function discoverZone(
  discoveredZones: string[],
  zoneId: string,
): {
  newZones: string[];
  isNew: boolean;
} {
  if (discoveredZones.includes(zoneId)) {
    return { newZones: discoveredZones, isNew: false };
  }
  return { newZones: [...discoveredZones, zoneId], isNew: true };
}

export function isZoneDiscovered(discoveredZones: string[], zoneId: string): boolean {
  return discoveredZones.includes(zoneId);
}
