/**
 * enemyShapesTier1 — procedural geometry for tier 1 enemy types.
 *
 * Tier 1: bat, killer-pig, abomination.
 * Each component is a group of primitive R3F meshes (spheres, planes, cylinders).
 *
 * See GAME_SPEC.md §20.
 */

import { SphereGeometry } from "three";
import type { BodyProps } from "./enemyColors.ts";

// ---------------------------------------------------------------------------
// Shared geometries (module-scope — created once)
// ---------------------------------------------------------------------------

const GEO_SPHERE_SM = new SphereGeometry(0.22, 6, 4);

// ---------------------------------------------------------------------------
// Shape builders
// ---------------------------------------------------------------------------

/** bat: small sphere body + 2 flat plane wings */
export const BatBody = ({ colors }: BodyProps) => (
  <group>
    <mesh geometry={GEO_SPHERE_SM} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.8} />
    </mesh>
    <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
      <planeGeometry args={[0.4, 0.25]} />
      <meshStandardMaterial color={colors.accent ?? colors.body} side={2} roughness={0.9} />
    </mesh>
    <mesh position={[0.35, 0, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
      <planeGeometry args={[0.4, 0.25]} />
      <meshStandardMaterial color={colors.accent ?? colors.body} side={2} roughness={0.9} />
    </mesh>
  </group>
);

/** killer-pig: ellipsoid body + small head + cylinder legs */
export const KillerPigBody = ({ colors }: BodyProps) => (
  <group>
    <mesh scale={[1.1, 0.7, 0.85]} castShadow receiveShadow>
      <sphereGeometry args={[0.4, 6, 4]} />
      <meshStandardMaterial color={colors.body} roughness={0.8} />
    </mesh>
    <mesh position={[0.45, 0.1, 0]} castShadow receiveShadow>
      <sphereGeometry args={[0.22, 6, 4]} />
      <meshStandardMaterial color={colors.body} roughness={0.8} />
    </mesh>
    {[-0.25, -0.05, 0.05, 0.25].map((x, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={i} position={[x, -0.45, i < 2 ? -0.12 : 0.12]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 5]} />
        <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.9} />
      </mesh>
    ))}
  </group>
);

/** abomination: deformed icosahedron blob */
export const AbominationBody = ({ colors }: BodyProps) => (
  <group>
    <mesh scale={[1, 0.8, 1.1]} castShadow receiveShadow>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial color={colors.body} roughness={0.9} />
    </mesh>
    <mesh position={[0.2, 0.3, 0.1]} scale={[0.6, 0.6, 0.6]} castShadow>
      <icosahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.95} />
    </mesh>
  </group>
);
