/**
 * EnemyMesh — R3F component that renders all ECS enemy entities.
 *
 * Queries `enemiesQuery` each frame, loads the GLB from `enemy.modelPath`,
 * and renders each enemy at its world-space position with a health bar billboard.
 *
 * If a GLB path is missing (model not found), a red sphere fallback is rendered
 * to make the gap immediately visible — this is NOT an error suppressor.
 *
 * See GAME_SPEC.md §20.
 */

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

import type { EnemyComponent, HealthComponent } from "@/game/ecs/world";
import { enemiesQuery } from "@/game/ecs/world";
import type { Entity } from "@/game/ecs/world";

// ---------------------------------------------------------------------------
// Pure utility functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Resolve the GLB model path from an EnemyComponent.
 *
 * Returns the `modelPath` field directly. The EnemyComponent always carries
 * the correct path (set when the entity was spawned from enemies.json).
 * A non-empty string is required — empty paths indicate a data error.
 */
export function resolveEnemyModelPath(enemy: EnemyComponent): string {
  if (!enemy.modelPath || enemy.modelPath.trim() === "") {
    return "MISSING_MODEL";
  }
  return enemy.modelPath;
}

/**
 * Compute the health bar color interpolated from red (0%) to green (100%).
 *
 * @param hp      Current hit points.
 * @param maxHp   Maximum hit points.
 * @returns       A hex color string, e.g. `"#ff0000"`.
 */
export function computeHealthBarColor(hp: number, maxHp: number): string {
  const ratio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / maxHp));
  // Red channel: 255 at 0%, 0 at 100%
  const r = Math.round(255 * (1 - ratio));
  // Green channel: 0 at 0%, 255 at 100%
  const g = Math.round(255 * ratio);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}00`;
}

// ---------------------------------------------------------------------------
// Health bar constants
// ---------------------------------------------------------------------------

const HEALTH_BAR_WIDTH = 1.0;
const HEALTH_BAR_HEIGHT = 0.08;
const HEALTH_BAR_Y_OFFSET = 2.2; // above the model
const HEALTH_BAR_BG_COLOR = "#333333";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface HealthBarProps {
  hp: number;
  maxHp: number;
  position: [number, number, number];
}

/**
 * Billboard health bar rendered above an enemy.
 * Hidden when hp === maxHp (full health).
 * Non-interactive: raycast={() => null}.
 */
const HealthBar = ({ hp, maxHp, position }: HealthBarProps) => {
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const fillWidth = HEALTH_BAR_WIDTH * ratio;
  const color = computeHealthBarColor(hp, maxHp);
  const visible = hp < maxHp;

  // Geometry is memoised — recreated only when dimensions change
  const bgGeo = useMemo(
    () => new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
    [],
  );
  const fillGeo = useMemo(
    () => new THREE.PlaneGeometry(fillWidth, HEALTH_BAR_HEIGHT),
    [fillWidth],
  );

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Background track */}
      <mesh
        geometry={bgGeo}
        // biome-ignore lint/suspicious/noExplicitAny: drei type compat
        raycast={() => null as any}
      >
        <meshBasicMaterial color={HEALTH_BAR_BG_COLOR} transparent opacity={0.7} />
      </mesh>
      {/* Filled portion — offset left so it grows left-to-right */}
      <mesh
        geometry={fillGeo}
        position={[-(HEALTH_BAR_WIDTH - fillWidth) / 2, 0, 0.001]}
        // biome-ignore lint/suspicious/noExplicitAny: drei type compat
        raycast={() => null as any}
      >
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Fallback renderer (missing GLB — renders an obvious red sphere)
// ---------------------------------------------------------------------------

const FALLBACK_SPHERE_GEO = new THREE.SphereGeometry(0.5, 8, 8);
const FALLBACK_MATERIAL = new THREE.MeshStandardMaterial({ color: "#ff0000" });

interface FallbackEnemyMeshProps {
  position: [number, number, number];
  hp: number;
  maxHp: number;
}

/** Renders a red sphere to make missing GLBs immediately visible (Spec §20 hard rule). */
const FallbackEnemyMesh = ({ position, hp, maxHp }: FallbackEnemyMeshProps) => (
  <group position={position}>
    <mesh geometry={FALLBACK_SPHERE_GEO} material={FALLBACK_MATERIAL} castShadow />
    <HealthBar hp={hp} maxHp={maxHp} position={[0, HEALTH_BAR_Y_OFFSET, 0]} />
  </group>
);

// ---------------------------------------------------------------------------
// GLB renderer (valid model path)
// ---------------------------------------------------------------------------

interface EnemyGLBProps {
  glbPath: string;
  position: [number, number, number];
  rotationY: number;
  hp: number;
  maxHp: number;
}

/**
 * Renders one enemy GLB.
 *
 * Separated into its own component so `useGLTF` is called unconditionally
 * (Rules of Hooks). Only mounted when the model path is valid.
 */
const EnemyGLB = ({ glbPath, position, rotationY, hp, maxHp }: EnemyGLBProps) => {
  const { scene } = useGLTF(glbPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={cloned} castShadow />
      <HealthBar hp={hp} maxHp={maxHp} position={[0, HEALTH_BAR_Y_OFFSET, 0]} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Single-enemy renderer (dispatches to GLB or fallback)
// ---------------------------------------------------------------------------

interface EnemyEntityRendererProps {
  entity: Entity & {
    enemy: EnemyComponent;
    position: NonNullable<Entity["position"]>;
    renderable: NonNullable<Entity["renderable"]>;
  };
}

const EnemyEntityRenderer = ({ entity }: EnemyEntityRendererProps) => {
  const { enemy, position, health } = entity;
  const modelPath = resolveEnemyModelPath(enemy);
  const worldPos: [number, number, number] = [position.x, position.y ?? 0, position.z];
  const rotationY = entity.rotationY ?? 0;

  const hp = health?.current ?? enemy.attackPower; // graceful: use attackPower sentinel if health missing
  const maxHp = health?.max ?? enemy.attackPower;

  if (modelPath === "MISSING_MODEL") {
    return <FallbackEnemyMesh position={worldPos} hp={hp} maxHp={maxHp} />;
  }

  return (
    <EnemyGLB
      glbPath={modelPath}
      position={worldPos}
      rotationY={rotationY}
      hp={hp}
      maxHp={maxHp}
    />
  );
};

// ---------------------------------------------------------------------------
// Public API — EnemyMeshes
// ---------------------------------------------------------------------------

/**
 * EnemyMeshes renders all active ECS enemy entities.
 *
 * Iterates `enemiesQuery` on every render. Each enemy is rendered using its
 * `enemy.modelPath` GLB with a health-bar billboard above it when damaged.
 *
 * Mount this once inside the R3F `<Canvas>` (handled by a separate agent).
 *
 * See GAME_SPEC.md §20.
 */
export const EnemyMeshes = () => {
  const entities = enemiesQuery.entities;

  return (
    <group name="enemy-meshes">
      {entities.map((entity) => (
        <EnemyEntityRenderer key={entity.id} entity={entity as EnemyEntityRendererProps["entity"]} />
      ))}
    </group>
  );
};
