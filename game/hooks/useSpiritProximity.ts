/**
 * useSpiritProximity -- detects when the player is within 2m of an undiscovered
 * Grovekeeper spirit and triggers discovery + dialogue session (Spec §32.3).
 *
 * Architecture: useFrame hook (runs inside the R3F Canvas, same pattern as
 * useRaycast and useGameLoop). Pure helper functions are exported separately
 * so they can be unit-tested without a Canvas context.
 *
 * On trigger:
 *   - Calls store.discoverSpirit(spiritId) — marks discovered, advances quest
 *   - Mutates grovekeeperSpirit.discovered = true on the ECS entity (compass
 *     reads this flag directly)
 *   - Sets dialogue ECS component on the spirit entity to open a speech bubble
 *   - Shows a toast notification
 *   - Sets a per-spirit cooldown to prevent double-triggers within 5 seconds
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import type { DialogueComponent } from "@/game/ecs/components/dialogue";
import { grovekeeperSpiritsQuery, playerQuery, world } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores/gameStore";
import { showToast } from "@/game/ui/Toast";
import { openDialogueSession } from "@/game/ui/dialogueBridge";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Distance in meters within which a spirit triggers discovery. */
export const SPIRIT_DETECTION_RADIUS = 2.0;

/** Cooldown in milliseconds before the same spirit can re-trigger. */
export const SPIRIT_COOLDOWN_MS = 5000;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Compute Euclidean 3D distance between two positions.
 *
 * @param ax World X of point A
 * @param ay World Y of point A
 * @param az World Z of point A
 * @param bx World X of point B
 * @param by World Y of point B
 * @param bz World Z of point B
 */
export function computeDistance3D(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Minimal spirit snapshot for proximity checking (decoupled from ECS). */
export interface SpiritSnapshot {
  spiritId: string;
  discovered: boolean;
  dialogueTreeId: string;
  x: number;
  y: number;
  z: number;
}

/** Minimal player position snapshot. */
export interface PlayerSnapshot {
  x: number;
  y: number;
  z: number;
}

/**
 * Check which spirit IDs should be triggered given the current player position,
 * a list of spirit snapshots, the current cooldown map, and the detection radius.
 *
 * Returns an array of spirit IDs that should fire discovery this tick.
 * Pure function — no side effects.
 *
 * @param player           Player position snapshot
 * @param spirits          All spirit snapshots (may include already-discovered)
 * @param cooldowns        Map of spiritId -> timestamp of last trigger (ms)
 * @param now              Current timestamp in ms (Date.now())
 * @param detectionRadius  Trigger radius in meters
 * @param cooldownMs       Cooldown period in ms
 */
export function checkSpiritProximity(
  player: PlayerSnapshot,
  spirits: SpiritSnapshot[],
  cooldowns: Map<string, number>,
  now: number,
  detectionRadius: number,
  cooldownMs: number,
): string[] {
  const triggered: string[] = [];

  for (const spirit of spirits) {
    // Skip already-discovered spirits
    if (spirit.discovered) continue;

    // Skip if still within cooldown window
    const lastTrigger = cooldowns.get(spirit.spiritId);
    if (lastTrigger !== undefined && now - lastTrigger < cooldownMs) continue;

    const dist = computeDistance3D(player.x, player.y, player.z, spirit.x, spirit.y, spirit.z);

    if (dist < detectionRadius) {
      triggered.push(spirit.spiritId);
    }
  }

  return triggered;
}

// ---------------------------------------------------------------------------
// Module-level cooldown store
// ---------------------------------------------------------------------------

/**
 * Per-spirit cooldown map. Survives re-renders; reset only when module is
 * unloaded (app restart / hot reload).
 * spiritId -> timestamp of last trigger (ms from Date.now()).
 */
const _spiritCooldowns = new Map<string, number>();

// ---------------------------------------------------------------------------
// Initial DialogueComponent state for a newly-triggered spirit
// ---------------------------------------------------------------------------

function makeDialogueComponent(treeId: string): DialogueComponent {
  return {
    activeTreeId: treeId,
    currentNodeId: null,
    bubbleVisible: true,
    visitedNodes: [],
    seedPath: [],
    inConversation: true,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Per-frame spirit proximity detection hook.
 *
 * Must be rendered inside an R3F <Canvas> (requires useFrame context).
 * Returns a ref containing the spiritId that was last triggered, or null.
 *
 * Mount this inside the GameSystems component in app/game/index.tsx.
 */
export function useSpiritProximity(): ReturnType<typeof useRef<string | null>> {
  const lastTriggeredRef = useRef<string | null>(null);

  useFrame(() => {
    // Resolve player position
    const player = playerQuery.first;
    if (!player?.position) return;

    const playerPos: PlayerSnapshot = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };

    // Snapshot all spirit entities
    const spirits: SpiritSnapshot[] = [];
    for (const entity of grovekeeperSpiritsQuery) {
      if (!entity.grovekeeperSpirit || !entity.position) continue;
      spirits.push({
        spiritId: entity.grovekeeperSpirit.spiritId,
        discovered: entity.grovekeeperSpirit.discovered,
        dialogueTreeId: entity.grovekeeperSpirit.dialogueTreeId,
        x: entity.position.x,
        y: entity.position.y,
        z: entity.position.z,
      });
    }

    if (spirits.length === 0) return;

    const now = Date.now();
    const triggered = checkSpiritProximity(
      playerPos,
      spirits,
      _spiritCooldowns,
      now,
      SPIRIT_DETECTION_RADIUS,
      SPIRIT_COOLDOWN_MS,
    );

    if (triggered.length === 0) return;

    const store = useGameStore.getState();

    for (const spiritId of triggered) {
      // Record cooldown immediately (prevents double-fire within same batch)
      _spiritCooldowns.set(spiritId, now);

      // Find the matching ECS entity
      let targetEntity:
        | (typeof grovekeeperSpiritsQuery extends Iterable<infer E> ? E : never)
        | null = null;
      for (const entity of grovekeeperSpiritsQuery) {
        if (entity.grovekeeperSpirit?.spiritId === spiritId) {
          targetEntity = entity;
          break;
        }
      }

      if (!targetEntity) continue;

      // 1. Mark as discovered in the store (advances quest, idempotent)
      const isNew = store.discoverSpirit(spiritId);

      // 2. Mutate the ECS component flag so compass clears immediately
      if (targetEntity.grovekeeperSpirit) {
        targetEntity.grovekeeperSpirit.discovered = true;
      }

      // 3. Set dialogue component on spirit entity to open a session
      world.addComponent(
        targetEntity,
        "dialogue",
        makeDialogueComponent(targetEntity.grovekeeperSpirit!.dialogueTreeId),
      );

      // 4. Open the NpcDialogue panel via the bridge (wires ECS state to React Native UI)
      openDialogueSession(targetEntity.id, store.worldSeed ?? "default");

      // 5. Show toast (only on genuine first discovery to avoid spam)
      if (isNew) {
        showToast("A Grovekeeper spirit stirs...", "info");
      }

      lastTriggeredRef.current = spiritId;
    }
  });

  return lastTriggeredRef;
}
