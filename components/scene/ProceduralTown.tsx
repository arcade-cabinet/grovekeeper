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
import { useMemo, useRef, useState } from "react";
import type { PointLight, Points } from "three";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";

import { campfiresQuery, dayNightQuery, proceduralBuildingsQuery } from "@/game/ecs/world";

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

/** Base point light intensity for lit campfires at night. */
const CAMPFIRE_LIGHT_BASE = 1.8;

/** Minimum intensity multiplier so the fire is always visible even at noon. */
const CAMPFIRE_LIGHT_MIN_MULT = 0.3;

/** Number of ember particles per campfire. */
const EMBER_COUNT = 15;

/** Maximum Y displacement of embers above the fire center. */
const EMBER_MAX_Y = 1.2;

// ---------------------------------------------------------------------------
// CampfireMesh sub-component
// ---------------------------------------------------------------------------

interface CampfireMeshProps {
  position: [number, number, number];
  lit: boolean;
  /** Sun intensity (0-1) from day/night cycle — used to dim fire at midday. */
  sunIntensity: number;
}

/**
 * CampfireMesh — procedural campfire: low-poly cylinder base + point light + embers.
 *
 * Renders a dark brown log-pile drum. When lit, adds an orange point light
 * above it (brighter at night) and rising ember particles. Kept lightweight
 * for mobile performance.
 */
const CampfireMesh = ({ position, lit, sunIntensity }: CampfireMeshProps) => {
  const [px, py, pz] = position;
  const lightRef = useRef<PointLight>(null);
  const embersRef = useRef<Points>(null);

  // Build a static ember particle geometry (positions animated per frame).
  // Initial positions are deterministic (no Math.random) — uses index-derived
  // offsets that spread embers across the fire area.
  const emberGeo = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i++) {
      positions[i * 3] = (((i * 7 + 3) % 10) / 10 - 0.5) * 0.3;
      positions[i * 3 + 1] = (((i * 13 + 1) % EMBER_COUNT) / EMBER_COUNT) * EMBER_MAX_Y;
      positions[i * 3 + 2] = (((i * 11 + 7) % 10) / 10 - 0.5) * 0.3;
    }
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Animate light intensity (day/night) and ember particles rising
  useFrame((_state, delta) => {
    if (!lit) return;

    // Scale intensity: bright at night (sunIntensity=0), dim at noon (sunIntensity=1)
    const nightFactor = 1 - sunIntensity;
    const intensity = CAMPFIRE_LIGHT_BASE * Math.max(CAMPFIRE_LIGHT_MIN_MULT, nightFactor + 0.3);
    if (lightRef.current) {
      lightRef.current.intensity = intensity;
    }

    // Animate ember particles upward
    if (embersRef.current) {
      const posAttr = embersRef.current.geometry.getAttribute("position") as BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < EMBER_COUNT; i++) {
        arr[i * 3 + 1] += delta * (0.4 + (i % 5) * 0.15);
        // Reset ember to base when it exceeds max height
        if (arr[i * 3 + 1] > EMBER_MAX_Y) {
          arr[i * 3] = (((i * 7 + 3) % 10) / 10 - 0.5) * 0.3;
          arr[i * 3 + 1] = 0.1;
          arr[i * 3 + 2] = (((i * 13 + 5) % 10) / 10 - 0.5) * 0.3;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

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
        <>
          <pointLight
            ref={lightRef}
            color="#ff8822"
            intensity={CAMPFIRE_LIGHT_BASE}
            distance={CAMPFIRE_LIGHT_DISTANCE}
            position={[0, CAMPFIRE_LIGHT_Y, 0]}
          />
          <points ref={embersRef} geometry={emberGeo} position={[0, 0.2, 0]}>
            <pointsMaterial
              color="#ff6600"
              size={0.04}
              blending={AdditiveBlending}
              transparent
              depthWrite={false}
            />
          </points>
        </>
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
  const sunIntensityRef = useRef(1);

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

    // Read sun intensity from day/night ECS for campfire light scaling
    const dayNight = dayNightQuery.entities[0];
    if (dayNight) {
      sunIntensityRef.current = dayNight.dayNight.sunIntensity;
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
            sunIntensity={sunIntensityRef.current}
          />
        );
      })}
    </>
  );
};
