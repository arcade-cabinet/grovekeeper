/**
 * useBirmotherEncounter -- Birchmother encounter lifecycle hook (Spec §32.4).
 *
 * Responsibilities:
 *   1. Spawns the Birchmother ECS entity at her seeded world position (once).
 *   2. Awakens her when main-quest-spirits is complete.
 *   3. Opens the birchmother-dialogue when the player is within 3m of an
 *      awakened Birchmother.
 *   4. On dialogue complete (converged): fires worldroot_reached objective,
 *      unlocking The Worldroot's Dream quest step.
 *
 * Architecture: useFrame hook (runs inside R3F Canvas). Pure helpers exported
 * for unit testing without Canvas context.
 *
 * Mount inside GameSystems in app/game/index.tsx.
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import type { DialogueComponent } from "@/game/ecs/components/dialogue";
import {
  birmotherQuery,
  generateEntityId,
  playerQuery,
  world,
} from "@/game/ecs/world";
import { isMainQuestComplete } from "@/game/quests/mainQuestSystem";
import { useGameStore } from "@/game/stores/gameStore";
import { showToast } from "@/game/ui/Toast";
import { computeBirmotherSpawn } from "@/game/world/WorldGenerator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Distance in meters within which the player triggers Birchmother dialogue. */
export const BIRCHMOTHER_TRIGGER_RADIUS = 3.0;

/** Cooldown in ms before the same encounter can re-trigger. */
export const BIRCHMOTHER_COOLDOWN_MS = 10_000;

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Compute XZ distance between two 2D points.
 *
 * Y axis is excluded: Birchmother is a large tree and the player may be at
 * any height relative to her base.
 */
export function computeDistanceXZ(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Snapshot of player position (XZ only for this hook). */
export interface PlayerPositionXZ {
  x: number;
  z: number;
}

/** Snapshot of Birchmother state for proximity logic. */
export interface BirmotherSnapshot {
  x: number;
  z: number;
  awakened: boolean;
  converged: boolean;
}

/**
 * Check whether the player should trigger the Birchmother encounter.
 *
 * Returns true when:
 *   - Birchmother is awakened
 *   - Birchmother has not yet converged
 *   - Player is within BIRCHMOTHER_TRIGGER_RADIUS
 *   - The cooldown has expired
 *
 * Pure function — no side effects.
 */
export function shouldTriggerBirchmother(
  player: PlayerPositionXZ,
  birchmother: BirmotherSnapshot,
  lastTriggerMs: number,
  nowMs: number,
  triggerRadius: number,
  cooldownMs: number,
): boolean {
  if (!birchmother.awakened) return false;
  if (birchmother.converged) return false;
  if (nowMs - lastTriggerMs < cooldownMs) return false;

  const dist = computeDistanceXZ(player.x, player.z, birchmother.x, birchmother.z);
  return dist < triggerRadius;
}

/**
 * Check whether the main quest is complete, given a list of completed chain IDs.
 *
 * Simple wrapper used by the hook so tests can mock it without importing
 * the full quest engine.
 */
export function isSpiritQuestComplete(completedChainIds: string[]): boolean {
  return completedChainIds.includes("main-quest-spirits");
}

// ---------------------------------------------------------------------------
// DialogueComponent factory
// ---------------------------------------------------------------------------

function makeBirmotherDialogue(): DialogueComponent {
  return {
    activeTreeId: "birchmother-dialogue",
    currentNodeId: null,
    bubbleVisible: true,
    visitedNodes: [],
    seedPath: [],
    inConversation: true,
  };
}

// ---------------------------------------------------------------------------
// Module-level state (survives re-renders; reset on app reload)
// ---------------------------------------------------------------------------

/** True once the Birchmother ECS entity has been created for this session. */
let _birmotherSpawned = false;

/** Timestamp of the last encounter trigger in ms. */
let _lastTriggerMs = 0;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Per-frame Birchmother encounter hook.
 *
 * Must be rendered inside an R3F <Canvas> (requires useFrame context).
 * Mount inside the GameSystems component in app/game/index.tsx.
 *
 * Returns a ref containing the latest Birchmother entity ID, or null.
 */
export function useBirmotherEncounter(): ReturnType<typeof useRef<string | null>> {
  const entityIdRef = useRef<string | null>(null);

  useFrame(() => {
    const store = useGameStore.getState();
    const worldSeed = store.worldSeed || "grovekeeper-default";

    // --- Step 1: Spawn Birchmother ECS entity on first run ---
    if (!_birmotherSpawned) {
      const spawnPos = computeBirmotherSpawn(worldSeed);
      const entityId = generateEntityId();

      world.add({
        id: entityId,
        position: { x: spawnPos.x, y: 0, z: spawnPos.z },
        birchmother: {
          dialogueTreeId: "birchmother-dialogue",
          awakened: false,
          converged: false,
          worldSeed,
        },
      });

      entityIdRef.current = entityId;
      _birmotherSpawned = true;
    }

    // --- Step 2: Awaken Birchmother when main-quest-spirits is complete ---
    const chainState = store.questChainState;
    const questComplete = isMainQuestComplete(chainState);

    for (const entity of birmotherQuery) {
      if (!entity.birchmother) continue;

      if (!entity.birchmother.awakened && questComplete) {
        entity.birchmother.awakened = true;
        showToast("The ancient light stirs at the heart of the world...", "info");
      }
    }

    // --- Step 3: Proximity check — open dialogue ---
    const player = playerQuery.first;
    if (!player?.position) return;

    const now = Date.now();

    for (const entity of birmotherQuery) {
      if (!entity.birchmother || !entity.position) continue;

      const snapshot: BirmotherSnapshot = {
        x: entity.position.x,
        z: entity.position.z,
        awakened: entity.birchmother.awakened,
        converged: entity.birchmother.converged,
      };

      const playerPos: PlayerPositionXZ = {
        x: player.position.x,
        z: player.position.z,
      };

      const triggered = shouldTriggerBirchmother(
        playerPos,
        snapshot,
        _lastTriggerMs,
        now,
        BIRCHMOTHER_TRIGGER_RADIUS,
        BIRCHMOTHER_COOLDOWN_MS,
      );

      if (!triggered) continue;

      // Record cooldown
      _lastTriggerMs = now;

      // Open dialogue by adding DialogueComponent to the entity
      world.addComponent(entity, "dialogue", makeBirmotherDialogue());

      entityIdRef.current = entity.id;
    }

    // --- Step 4: Detect dialogue completion → fire worldroot_reached ---
    for (const entity of birmotherQuery) {
      if (!entity.birchmother || !entity.dialogue) continue;

      // Dialogue is complete when inConversation = false on a previously active session
      if (
        !entity.dialogue.inConversation &&
        entity.birchmother.awakened &&
        !entity.birchmother.converged
      ) {
        entity.birchmother.converged = true;

        // Fire worldroot_reached objective (advances worldroots-dream quest)
        store.advanceQuestObjective("worldroot_reached", 1);

        showToast("The Worldroot's Dream is fulfilled.", "success");
      }
    }
  });

  return entityIdRef;
}
