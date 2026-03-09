/**
 * ChibiNpcScene — ECS-driven orchestrator that renders all NPC entities
 * as procedural ChibiNpc components.
 *
 * Reads npcsQuery.entities every frame via useFrame to stay in sync with
 * chunk load/unload. Advances animProgress per-entity on each tick so
 * ChibiNpc receives updated values and applies rigid-body animation.
 *
 * Material cleanup: ChibiNpc creates its own MeshStandardMaterial instances
 * via useMemo — React unmounts each ChibiNpc when its entity leaves the
 * query, which disposes the materials via their ref lifecycle in ChibiNpc.
 *
 * Module-scope temp objects are used to avoid per-frame allocation (Rule 1).
 *
 * See GAME_SPEC.md §15.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { NpcAnimState, NpcFunction } from "@/game/ecs/components/npc";
import { dialogueQuery, npcsQuery } from "@/game/ecs/world";
import { ChibiNpc } from "./ChibiNpc.tsx";
import { SpeechBubble } from "./SpeechBubble.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NpcSnapshot {
  id: string;
  templateId: string;
  npcFunction: NpcFunction;
  position: [number, number, number];
  animState: "idle" | "walk";
  animProgress: number;
  bubbleVisible: boolean;
  bubbleText: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collapse NpcAnimState → the two states ChibiNpc understands. */
function toAnimState(state: NpcAnimState): "idle" | "walk" {
  return state === "walk" ? "walk" : "idle";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChibiNpcSceneProps {
  worldSeed: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ChibiNpcScene = ({ worldSeed }: ChibiNpcSceneProps) => {
  // animProgressRef tracks per-entity progress between renders without
  // triggering re-renders on every frame tick.
  const animProgressRef = useRef<Map<string, number>>(new Map());

  // snapshot drives re-renders only when entity set or positions change.
  const [snapshots, setSnapshots] = useState<NpcSnapshot[]>([]);

  // snapshotsRef mirrors snapshots state so useFrame can read the latest
  // value without a stale closure. useState alone would capture the
  // mount-time empty array inside useFrame forever.
  const snapshotsRef = useRef<NpcSnapshot[]>([]);

  // lastCountRef lets us detect entity count changes quickly.
  const lastCountRef = useRef(0);

  useFrame((_state, delta) => {
    const entities = npcsQuery.entities;
    const progMap = animProgressRef.current;

    // Advance animProgress for every live entity (visible or not) so
    // they resume mid-cycle when they enter the active ring.
    for (const entity of entities) {
      const id = entity.id;
      const speed = entity.npc.animSpeed ?? 2.0;
      const prev = progMap.get(id) ?? 0;
      progMap.set(id, prev + delta * speed);
    }

    // Prune stale entries from animProgressRef to prevent unbounded growth.
    const aliveIds = new Set(entities.map((e) => e.id));
    for (const id of progMap.keys()) {
      if (!aliveIds.has(id)) progMap.delete(id);
    }

    // Only render NPCs whose chunk is in the active ring (renderable.visible).
    // Buffer-ring NPCs have visible:false and should not be drawn.
    const visibleEntities = entities.filter((e) => e.renderable.visible);

    // Rebuild snapshot when visible-entity count changes OR any visible entity's
    // position has drifted from the last snapshot. Position must be re-read from
    // the live ECS entities — the original "count-only" guard was freezing stale
    // Y values (entities spawn at y:0 and heightmap Y arrives later).
    const countChanged = visibleEntities.length !== lastCountRef.current;
    let positionDrifted = false;
    if (!countChanged && visibleEntities.length > 0) {
      const prev = snapshotsRef.current;
      for (let i = 0; i < visibleEntities.length; i++) {
        const e = visibleEntities[i];
        const s = prev[i];
        if (
          !s ||
          s.id !== e.id ||
          s.position[0] !== e.position.x ||
          s.position[1] !== e.position.y ||
          s.position[2] !== e.position.z
        ) {
          positionDrifted = true;
          break;
        }
      }
    }

    if (countChanged || positionDrifted) {
      lastCountRef.current = visibleEntities.length;
      // Build a set of entity IDs currently in dialogue for bubble display
      const dialogueEntityIds = new Set<string>();
      for (const de of dialogueQuery.entities) {
        if (de.dialogue?.bubbleVisible && de.dialogue?.inConversation) {
          dialogueEntityIds.add(de.id);
        }
      }

      const next: NpcSnapshot[] = visibleEntities.map((entity) => ({
        id: entity.id,
        templateId: entity.npc.templateId,
        npcFunction: entity.npc.function as NpcFunction,
        position: [entity.position.x, entity.position.y, entity.position.z] as [
          number,
          number,
          number,
        ],
        animState: toAnimState(entity.npc.currentAnim),
        animProgress: progMap.get(entity.id) ?? 0,
        bubbleVisible: dialogueEntityIds.has(entity.id),
        bubbleText: entity.npc.name ?? entity.npc.templateId,
      }));
      snapshotsRef.current = next;
      setSnapshots(next);
    }
  });

  if (snapshots.length === 0) return null;

  return (
    <>
      {snapshots.map((snap) => (
        <ChibiNpc
          key={snap.id}
          npcId={snap.templateId}
          worldSeed={worldSeed}
          npcFunction={snap.npcFunction}
          position={snap.position}
          animState={snap.animState}
          animProgress={animProgressRef.current.get(snap.id) ?? snap.animProgress}
        />
      ))}
      {/* Speech bubbles — always mounted so fade-out animation works (Spec §33.5). */}
      {snapshots.map((snap) => (
        <SpeechBubble
          key={`bubble-${snap.id}`}
          x={snap.position[0]}
          y={snap.position[1]}
          z={snap.position[2]}
          text={snap.bubbleText}
          visible={snap.bubbleVisible}
        />
      ))}
    </>
  );
};
