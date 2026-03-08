/**
 * enemyShapesTier45 — procedural geometry for tier 3-5 enemy types.
 *
 * Tier 3: cyclops, blood-wraith
 * Tier 4: corrupted-hedge
 * Tier 5: devil
 *
 * See GAME_SPEC.md §20.
 */

import { SphereGeometry } from "three";
import type { BodyProps } from "./enemyColors.ts";

// ---------------------------------------------------------------------------
// Shared geometries (module-scope — created once)
// ---------------------------------------------------------------------------

const GEO_SPHERE_MD = new SphereGeometry(0.35, 6, 4);
const GEO_SPHERE_LG = new SphereGeometry(0.5, 6, 4);
const GEO_SPHERE_EYE = new SphereGeometry(0.12, 5, 3);

// ---------------------------------------------------------------------------
// Shape builders
// ---------------------------------------------------------------------------

/** cyclops: large sphere body + head + single emissive eye */
export const CyclopsBody = ({ colors }: BodyProps) => (
  <group>
    <mesh geometry={GEO_SPHERE_LG} scale={[1, 1.1, 0.9]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.8} flatShading />
    </mesh>
    <mesh geometry={GEO_SPHERE_MD} position={[0, 0.8, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.8} flatShading />
    </mesh>
    <mesh geometry={GEO_SPHERE_EYE} position={[0, 0.88, 0.3]}>
      <meshStandardMaterial
        color={colors.emissive ?? "#ffaa00"}
        emissive={colors.emissive ?? "#ffaa00"}
        emissiveIntensity={1.5}
      />
    </mesh>
  </group>
);

/** blood-wraith: translucent emissive icosahedron */
export const BloodWraithBody = ({ colors }: BodyProps) => (
  <group>
    <mesh scale={[1, 1.2, 1]} castShadow>
      <icosahedronGeometry args={[0.45, 1]} />
      <meshStandardMaterial
        color={colors.body}
        emissive={colors.emissive ?? colors.body}
        emissiveIntensity={0.8}
        transparent
        opacity={0.6}
        depthWrite={false}
        roughness={0.2}
      />
    </mesh>
    <mesh scale={[0.7, 0.9, 0.7]}>
      <icosahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial
        color={colors.emissive ?? colors.body}
        emissive={colors.emissive ?? colors.body}
        emissiveIntensity={1.2}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  </group>
);

/** corrupted-hedge: sphere with spiky icosahedron overlay */
export const CorruptedHedgeBody = ({ colors }: BodyProps) => (
  <group>
    <mesh geometry={GEO_SPHERE_MD} scale={[1.2, 0.9, 1.2]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.95} />
    </mesh>
    <mesh castShadow>
      <icosahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.9} flatShading />
    </mesh>
  </group>
);

/** devil: large body + cone horns + emissive glow + arms */
export const DevilBody = ({ colors }: BodyProps) => (
  <group>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.35, 0.42, 1.1, 6]} />
      <meshStandardMaterial
        color={colors.body}
        emissive={colors.emissive ?? "#ff0000"}
        emissiveIntensity={0.3}
        roughness={0.5}
      />
    </mesh>
    <mesh geometry={GEO_SPHERE_MD} position={[0, 0.85, 0]} castShadow receiveShadow>
      <meshStandardMaterial
        color={colors.body}
        emissive={colors.emissive ?? "#ff0000"}
        emissiveIntensity={0.3}
        roughness={0.5}
      />
    </mesh>
    {([-0.18, 0.18] as const).map((x, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={i} position={[x, 1.2, 0]} rotation={[0, 0, x < 0 ? -0.3 : 0.3]} castShadow>
        <coneGeometry args={[0.07, 0.35, 4]} />
        <meshStandardMaterial
          color={colors.accent ?? "#550000"}
          emissive={colors.emissive ?? "#ff2200"}
          emissiveIntensity={0.6}
        />
      </mesh>
    ))}
    {([-1, 1] as const).map((side) => (
      <mesh
        key={`arm-${side}`}
        position={[side * 0.5, 0.15, 0]}
        rotation={[0, 0, side * 0.35]}
        castShadow
      >
        <cylinderGeometry args={[0.1, 0.12, 0.65, 5]} />
        <meshStandardMaterial
          color={colors.accent ?? colors.body}
          emissive={colors.emissive ?? "#ff0000"}
          emissiveIntensity={0.2}
        />
      </mesh>
    ))}
  </group>
);

/** Fallback for unknown enemy types */
export const FallbackEnemyBody = ({ colors }: BodyProps) => (
  <mesh geometry={GEO_SPHERE_MD} castShadow receiveShadow>
    <meshStandardMaterial color={colors.body} roughness={0.8} />
  </mesh>
);
