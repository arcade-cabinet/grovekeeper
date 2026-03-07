/**
 * useWorldLoader -- Loads the starting zone into ECS on mount.
 *
 * Reads starting-world.json, finds the current zone, and hydrates
 * tile/tree/NPC entities via ZoneLoader. Idempotent: skips if
 * entities already exist for the zone.
 */

import { useEffect, useRef } from "react";
import startingWorld from "@/config/world/starting-world.json" with { type: "json" };
import { world } from "@/game/ecs/world";

const gridCellsQuery = world.with("gridCell", "position");
import { useGameStore } from "@/game/stores/gameStore";
import type { WorldDefinition, ZoneDefinition } from "@/game/world/types";
import { loadZoneEntities } from "@/game/world/ZoneLoader";

const worldDef = startingWorld as unknown as WorldDefinition;

/**
 * Look up a zone definition by ID from the starting world data.
 */
function getZoneById(zoneId: string): ZoneDefinition | undefined {
  return worldDef.zones.find((z) => z.id === zoneId);
}

/**
 * Hook that loads the current zone's entities into the ECS world.
 * Should be called once from the game screen component.
 */
export function useWorldLoader(): void {
  const loadedZoneRef = useRef<string | null>(null);

  useEffect(() => {
    const store = useGameStore.getState();
    const zoneId = store.currentZoneId;

    // Skip if already loaded this zone
    if (loadedZoneRef.current === zoneId) return;

    // Skip if ECS already has grid cells (e.g., restored from save)
    if (gridCellsQuery.size > 0) {
      loadedZoneRef.current = zoneId;
      return;
    }

    const zone = getZoneById(zoneId);
    if (!zone) return;

    loadZoneEntities(zone);
    loadedZoneRef.current = zoneId;

    // Mark zone as discovered and set current
    store.setCurrentZoneId(zoneId);
    store.discoverZone(zoneId);
    if (zone.type) {
      store.trackVisitedZoneType(zone.type);
    }
  }, []);
}
