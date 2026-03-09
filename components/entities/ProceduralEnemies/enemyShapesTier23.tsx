/**
 * enemyShapesTier23 — procedural geometry for tier 2-3 enemy types.
 *
 * Tier 2: elk-demon, green-goliath, bigfoot, plague-doctor, skeleton-warrior
 * Tier 3: knight, werewolf
 *
 * See GAME_SPEC.md §20.
 */

import { SphereGeometry } from "three";
import type { BodyProps } from "./enemyColors.ts";

// ---------------------------------------------------------------------------
// Shared geometries (module-scope — created once)
// ---------------------------------------------------------------------------

const GEO_SPHERE_SM = new SphereGeometry(0.22, 6, 4);
const GEO_SPHERE_MD = new SphereGeometry(0.35, 6, 4);
const GEO_SPHERE_LG = new SphereGeometry(0.5, 6, 4);
const GEO_SPHERE_EYE = new SphereGeometry(0.12, 5, 3);

// ---------------------------------------------------------------------------
// Shape builders
// ---------------------------------------------------------------------------

/** elk-demon: tall cylinder body + head + two antler cylinders with emissive tips */
export const ElkDemonBody = ({ colors }: BodyProps) => (
  <group>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.28, 0.35, 1.0, 6]} />
      <meshStandardMaterial color={colors.body} roughness={0.8} />
    </mesh>
    <mesh geometry={GEO_SPHERE_MD} position={[0, 0.7, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.8} />
    </mesh>
    <mesh position={[-0.18, 1.1, 0]} rotation={[0, 0, -0.4]} castShadow>
      <cylinderGeometry args={[0.03, 0.05, 0.6, 4]} />
      <meshStandardMaterial
        color={colors.accent ?? colors.body}
        emissive={colors.emissive ?? "#000"}
        emissiveIntensity={0.8}
        roughness={0.5}
      />
    </mesh>
    <mesh position={[0.18, 1.1, 0]} rotation={[0, 0, 0.4]} castShadow>
      <cylinderGeometry args={[0.03, 0.05, 0.6, 4]} />
      <meshStandardMaterial
        color={colors.accent ?? colors.body}
        emissive={colors.emissive ?? "#000"}
        emissiveIntensity={0.8}
        roughness={0.5}
      />
    </mesh>
  </group>
);

/** green-goliath: large sphere body + small head + cylinder arms */
export const GreenGoliathBody = ({ colors }: BodyProps) => (
  <group>
    <mesh geometry={GEO_SPHERE_LG} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.7} />
    </mesh>
    <mesh geometry={GEO_SPHERE_SM} position={[0, 0.75, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.7} />
    </mesh>
    <mesh position={[-0.65, 0.1, 0]} rotation={[0, 0, Math.PI / 3]} castShadow>
      <cylinderGeometry args={[0.1, 0.12, 0.7, 5]} />
      <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.8} />
    </mesh>
    <mesh position={[0.65, 0.1, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow>
      <cylinderGeometry args={[0.1, 0.12, 0.7, 5]} />
      <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.8} />
    </mesh>
  </group>
);

/** bigfoot: tall cylinder body + sphere head + cylinder arms and legs */
export const BigfootBody = ({ colors }: BodyProps) => (
  <group>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.3, 0.35, 1.1, 6]} />
      <meshStandardMaterial color={colors.body} roughness={0.9} />
    </mesh>
    <mesh geometry={GEO_SPHERE_MD} position={[0, 0.8, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.9} />
    </mesh>
    {([-1, 1] as const).map((side, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={i} position={[side * 0.45, 0.1, 0]} rotation={[0, 0, side * 0.4]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 5]} />
        <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.9} />
      </mesh>
    ))}
    {([-1, 1] as const).map((side, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={`leg-${i}`} position={[side * 0.2, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.4, 5]} />
        <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.9} />
      </mesh>
    ))}
  </group>
);

/** plague-doctor: cylinder body + cone beak head + emissive eye sockets */
export const PlagueDoctorBody = ({ colors }: BodyProps) => (
  <group>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.25, 0.3, 0.9, 6]} />
      <meshStandardMaterial color={colors.body} roughness={0.6} />
    </mesh>
    <mesh geometry={GEO_SPHERE_MD} position={[0, 0.65, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.6, 0.28]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <coneGeometry args={[0.07, 0.3, 4]} />
      <meshStandardMaterial color={colors.body} roughness={0.5} />
    </mesh>
    {([-0.1, 0.1] as const).map((x, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={i} geometry={GEO_SPHERE_EYE} position={[x, 0.7, 0.22]}>
        <meshStandardMaterial
          color={colors.emissive ?? "#00ff44"}
          emissive={colors.emissive ?? "#00cc44"}
          emissiveIntensity={1.2}
        />
      </mesh>
    ))}
  </group>
);

/** skeleton-warrior: thin cylinder body + sphere head + cylinder arm + box sword */
export const SkeletonWarriorBody = ({ colors }: BodyProps) => (
  <group>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.2, 0.22, 0.9, 5]} />
      <meshStandardMaterial color={colors.body} roughness={0.6} />
    </mesh>
    <mesh geometry={GEO_SPHERE_SM} position={[0, 0.65, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.6} />
    </mesh>
    <mesh position={[-0.35, 0.15, 0]} rotation={[0, 0, Math.PI / 5]} castShadow>
      <cylinderGeometry args={[0.05, 0.06, 0.5, 4]} />
      <meshStandardMaterial color={colors.body} roughness={0.7} />
    </mesh>
    <mesh position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI / 8]} castShadow>
      <boxGeometry args={[0.06, 0.65, 0.04]} />
      <meshStandardMaterial color={colors.accent ?? "#aaaaaa"} roughness={0.3} metalness={0.5} />
    </mesh>
  </group>
);

/** knight: box armor body + sphere head + arm cylinders + box sword */
export const KnightBody = ({ colors }: BodyProps) => (
  <group>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.55, 0.9, 0.35]} />
      <meshStandardMaterial color={colors.body} roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh geometry={GEO_SPHERE_MD} position={[0, 0.7, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.4} metalness={0.6} />
    </mesh>
    {([-1, 1] as const).map((side, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={i} position={[side * 0.42, 0.1, 0]} rotation={[0, 0, side * 0.3]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.55, 5]} />
        <meshStandardMaterial
          color={colors.accent ?? colors.body}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>
    ))}
    <mesh position={[0.55, -0.05, 0]} rotation={[0, 0, -Math.PI / 10]} castShadow>
      <boxGeometry args={[0.06, 0.75, 0.05]} />
      <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.7} />
    </mesh>
  </group>
);

/** werewolf: crouched sphere body + sphere head + cylinder limbs */
export const WerewolfBody = ({ colors }: BodyProps) => (
  <group rotation={[0.2, 0, 0]}>
    <mesh geometry={GEO_SPHERE_LG} scale={[1, 0.85, 1]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.9} />
    </mesh>
    <mesh geometry={GEO_SPHERE_SM} position={[0, 0.6, 0.25]} castShadow receiveShadow>
      <meshStandardMaterial color={colors.body} roughness={0.9} />
    </mesh>
    {([-1, 1] as const).map((side, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={i} position={[side * 0.4, -0.1, 0]} rotation={[0.3, 0, side * 0.4]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.55, 5]} />
        <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.9} />
      </mesh>
    ))}
    {([-1, 1] as const).map((side, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array never reorders
      <mesh key={`leg-${i}`} position={[side * 0.22, -0.65, 0.05]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.4, 5]} />
        <meshStandardMaterial color={colors.accent ?? colors.body} roughness={0.9} />
      </mesh>
    ))}
  </group>
);
