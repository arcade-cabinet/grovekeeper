/**
 * ProceduralTown — Queries ECS and renders all procedural buildings + campfires.
 *
 * Uses useFrame-driven entity tracking: entity count is stored in state so React
 * re-renders when buildings are added/removed (chunk load/unload). Buildings are
 * rendered as <ProceduralBuilding> components (one draw call each). Campfires
 * are rendered as procedural cylinder + point light pairs (no GLB dependency).
 *
 * Spec §42 (Procedural Architecture).
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

import { campfiresQuery, proceduralBuildingsQuery } from "@/game/ecs/world";

import { ProceduralBuilding } from "./ProceduralBuilding.tsx";

// ---------------------------------------------------------------------------
// Campfire constants — all values from config/game/structures.json implicitly
// via the ECS campfireComponent.effectRadius. Geometry constants are editorial
// choices for stylized low-poly look (not tuning values).
// ---------------------------------------------------------------------------

/** Radius of the campfire log-pile cylinder base in world units. */
const CAMPFIRE_BASE_RADIUS = 0.25;

/** Height of the campfire log-pile cylinder in world units. */
const CAMPFIRE_BASE_HEIGHT = 0.18;

/** Radial segments on the campfire cylinder. */
const CAMPFIRE_SEGMENTS = 12;

/** Y offset of the point light above the campfire base center. */
const CAMPFIRE_LIGHT_Y = 0.6;

/** Point light distance falloff in world units. */
const CAMPFIRE_LIGHT_DISTANCE = 5.0;

/** Point light intensity for lit campfires. */
const CAMPFIRE_LIGHT_INTENSITY = 1.8;

// ---------------------------------------------------------------------------
// CampfireMesh sub-component
// ---------------------------------------------------------------------------

interface CampfireMeshProps {
  position: [number, number, number];
  lit: boolean;
}

/**
 * CampfireMesh — procedural campfire: low-poly cylinder base + point light.
 *
 * Renders a dark brown log-pile drum. When lit, adds an orange point light
 * above it for ambient warmth. Kept under ~30 vertices for mobile performance.
 */
const CampfireMesh = ({ position, lit }: CampfireMeshProps) => {
  const [px, py, pz] = position;

  return (
    <group position={[px, py, pz]}>
      <mesh castShadow>
        <cylinderGeometry
          args={[
            CAMPFIRE_BASE_RADIUS,
            CAMPFIRE_BASE_RADIUS * 1.2,
            CAMPFIRE_BASE_HEIGHT,
            CAMPFIRE_SEGMENTS,
          ]}
        />
        <meshStandardMaterial color="#3a2010" />
      </mesh>
      {lit ? (
        <pointLight
          color="#ff8822"
          intensity={CAMPFIRE_LIGHT_INTENSITY}
          distance={CAMPFIRE_LIGHT_DISTANCE}
          position={[0, CAMPFIRE_LIGHT_Y, 0]}
        />
      ) : null}
    </group>
  );
};

// ---------------------------------------------------------------------------
// ProceduralTown
// ---------------------------------------------------------------------------

/**
 * ProceduralTown — renders all ECS procedural buildings and campfires.
 *
 * Entity tracking: useFrame reads entity counts each frame.  When the count
 * changes (chunk load/unload), state updates and React re-renders the list.
 * This keeps the React reconciler in charge of mount/unmount while avoiding
 * per-frame re-renders when nothing changes.
 */
export const ProceduralTown = () => {
  const [buildingCount, setBuildingCount] = useState(0);
  const [campfireCount, setCampfireCount] = useState(0);

  // Stable refs so useFrame closure never captures stale values.
  const prevBuildingCount = useRef(0);
  const prevCampfireCount = useRef(0);

  useFrame(() => {
    const bc = proceduralBuildingsQuery.entities.length;
    const cc = campfiresQuery.entities.length;

    if (bc !== prevBuildingCount.current) {
      prevBuildingCount.current = bc;
      setBuildingCount(bc);
    }
    if (cc !== prevCampfireCount.current) {
      prevCampfireCount.current = cc;
      setCampfireCount(cc);
    }
  });

  // Silence unused-variable lint for derived-count state (used only to trigger
  // re-render; actual entity arrays come from the live query at render time).
  void buildingCount;
  void campfireCount;

  return (
    <>
      {proceduralBuildingsQuery.entities.map((entity) => {
        const { id, proceduralBuilding, position } = entity;
        return (
          <ProceduralBuilding
            key={id}
            footprintW={proceduralBuilding.footprintW}
            footprintD={proceduralBuilding.footprintD}
            stories={proceduralBuilding.stories}
            materialType={proceduralBuilding.materialType}
            blueprintId={proceduralBuilding.blueprintId}
            facing={proceduralBuilding.facing}
            variation={proceduralBuilding.variation}
            position={[position.x, position.y, position.z]}
          />
        );
      })}

      {campfiresQuery.entities.map((entity) => {
        const { id, campfire, position } = entity;
        return (
          <CampfireMesh
            key={id}
            position={[position.x, position.y, position.z]}
            lit={campfire.lit}
          />
        );
      })}
    </>
  );
};
