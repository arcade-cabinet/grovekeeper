/**
 * toolShapes — procedural geometry bodies for each held tool.
 *
 * Each shape is a React component assembled from primitive geometries
 * (CylinderGeometry, BoxGeometry, ConeGeometry). Colors follow the
 * Modern Zelda-style aesthetic: warm brown handles, metallic heads.
 *
 * TOOL_SHAPES maps toolId strings to shape builder functions.
 * ProceduralToolModel in index.tsx looks up and renders the matching builder.
 *
 * See GAME_SPEC.md §11.
 */

// ---------------------------------------------------------------------------
// Shared material color constants
// ---------------------------------------------------------------------------

const COLOR_HANDLE = "#5c3a21";
const COLOR_METAL = "#888888";
const COLOR_BLADE = "#aaaaaa";

// ---------------------------------------------------------------------------
// Shared props interface
// ---------------------------------------------------------------------------

export interface ToolShapeProps {
  scale: number;
}

// ---------------------------------------------------------------------------
// Per-tool shape builders
// ---------------------------------------------------------------------------

/** trowel: short cylinder handle + flat box blade angled at tip */
export const TrowelShape = ({ scale }: ToolShapeProps) => (
  <group scale={[scale, scale, scale]}>
    <mesh position={[0, -0.25, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.035, 0.5, 5]} />
      <meshStandardMaterial color={COLOR_HANDLE} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.1, 0]} rotation={[0.3, 0, 0]} castShadow>
      <boxGeometry args={[0.08, 0.22, 0.02]} />
      <meshStandardMaterial color={COLOR_BLADE} roughness={0.3} metalness={0.5} />
    </mesh>
  </group>
);

/** axe: cylinder handle + wedge box head */
export const AxeShape = ({ scale }: ToolShapeProps) => (
  <group scale={[scale, scale, scale]}>
    <mesh position={[0, -0.3, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.035, 0.7, 5]} />
      <meshStandardMaterial color={COLOR_HANDLE} roughness={0.9} />
    </mesh>
    <mesh position={[0.12, 0.12, 0]} rotation={[0, 0, -0.4]} castShadow>
      <boxGeometry args={[0.22, 0.18, 0.05]} />
      <meshStandardMaterial color={COLOR_METAL} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0.18, 0.08, 0]} rotation={[0, 0, -0.9]} castShadow>
      <boxGeometry args={[0.08, 0.06, 0.03]} />
      <meshStandardMaterial color={COLOR_BLADE} roughness={0.2} metalness={0.7} />
    </mesh>
  </group>
);

/** pruning-shears: two thin box blades + cylinder pivot pin */
export const PruningShearShape = ({ scale }: ToolShapeProps) => (
  <group scale={[scale, scale, scale]}>
    <mesh position={[0, -0.15, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.03, 0.3, 4]} />
      <meshStandardMaterial color={COLOR_METAL} roughness={0.4} metalness={0.5} />
    </mesh>
    <mesh position={[-0.06, 0.06, 0]} rotation={[0, 0, 0.35]} castShadow>
      <boxGeometry args={[0.04, 0.3, 0.03]} />
      <meshStandardMaterial color={COLOR_BLADE} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0.06, 0.06, 0]} rotation={[0, 0, -0.35]} castShadow>
      <boxGeometry args={[0.04, 0.3, 0.03]} />
      <meshStandardMaterial color={COLOR_BLADE} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0, 0]} castShadow>
      <cylinderGeometry args={[0.025, 0.025, 0.04, 4]} />
      <meshStandardMaterial color={COLOR_METAL} roughness={0.4} metalness={0.7} />
    </mesh>
  </group>
);

/** shovel: long cylinder handle + box scoop */
export const ShovelShape = ({ scale }: ToolShapeProps) => (
  <group scale={[scale, scale, scale]}>
    <mesh position={[0, -0.3, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.035, 0.75, 5]} />
      <meshStandardMaterial color={COLOR_HANDLE} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.18, 0.04]} rotation={[0.25, 0, 0]} castShadow>
      <boxGeometry args={[0.18, 0.22, 0.03]} />
      <meshStandardMaterial color={COLOR_METAL} roughness={0.35} metalness={0.5} />
    </mesh>
  </group>
);

/** pickaxe: cylinder handle + two pointed cone heads (T-shape) */
export const PickaxeShape = ({ scale }: ToolShapeProps) => (
  <group scale={[scale, scale, scale]}>
    <mesh position={[0, -0.28, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.035, 0.7, 5]} />
      <meshStandardMaterial color={COLOR_HANDLE} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.03, 0.03, 0.5, 5]} />
      <meshStandardMaterial color={COLOR_METAL} roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[-0.2, 0.12, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
      <coneGeometry args={[0.04, 0.15, 4]} />
      <meshStandardMaterial color={COLOR_BLADE} roughness={0.25} metalness={0.7} />
    </mesh>
    <mesh position={[0.2, 0.12, 0]} rotation={[0, 0, Math.PI / 6 + Math.PI]} castShadow>
      <coneGeometry args={[0.04, 0.1, 4]} />
      <meshStandardMaterial color={COLOR_BLADE} roughness={0.25} metalness={0.7} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Shape map (toolId -> builder)
// ---------------------------------------------------------------------------

export const TOOL_SHAPES: Record<string, (props: ToolShapeProps) => React.ReactElement> = {
  trowel: (p) => <TrowelShape {...p} />,
  axe: (p) => <AxeShape {...p} />,
  "pruning-shears": (p) => <PruningShearShape {...p} />,
  shovel: (p) => <ShovelShape {...p} />,
  pickaxe: (p) => <PickaxeShape {...p} />,
};
