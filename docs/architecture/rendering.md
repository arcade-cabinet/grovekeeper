# Rendering Architecture

Grovekeeper's 3D rendering uses React Three Fiber (R3F) with a fully declarative, component-based architecture. The scene is composed of React components inside a `<Canvas>`, each owning its own per-frame logic via `useFrame` hooks.

## Scene Decomposition

The scene is organized into three domain groups:

```jsx
<Canvas>
  <WorldScene>
    <Camera />           // PerspectiveCamera, follows player
    <Lighting />         // Ambient + directional, day/night sync
    <Sky />              // HDRI skybox or drei Sky component
    <Ground />           // Biome-blended ground plane
  </WorldScene>
  <EntityLayer>
    <Player />           // Player mesh + useFrame movement
    <TreeInstances />    // InstancedMesh trees, growth animation
    <NpcMeshes />        // NPC meshes + Yuka brain integration
    <Structures />       // Structure block meshes
    <BorderTrees />      // Decorative border trees
  </EntityLayer>
  <InteractionLayer>
    <SelectionRing />    // Torus highlight on tap target
    <PlacementGhost />   // Translucent structure preview
  </InteractionLayer>
</Canvas>
```

Each component is self-contained -- it creates its own geometry, materials, and per-frame update logic. There is no monolithic game loop or manager class hierarchy.

### Component Responsibilities

| Component | File | Responsibility |
|-----------|------|---------------|
| Camera | `components/scene/Camera.tsx` | PerspectiveCamera, follows player position |
| Lighting | `components/scene/Lighting.tsx` | Ambient + directional light, day/night color sync |
| Sky | `components/scene/Sky.tsx` | Skybox with seasonal rotation |
| Ground | `components/scene/Ground.tsx` | Biome-blended ground plane, grid overlay |
| Player | `components/entities/Player.tsx` | Player mesh, position sync from ECS |
| TreeInstances | `components/entities/TreeInstances.tsx` | InstancedMesh for all trees, growth lerp |
| NpcMeshes | `components/entities/NpcMeshes.tsx` | NPC meshes with Yuka AI integration |
| Structures | `components/entities/Structures.tsx` | Structure block meshes |
| BorderTrees | `components/entities/BorderTrees.tsx` | Decorative trees outside playable grid |
| SelectionRing | `components/interaction/SelectionRing.tsx` | Torus highlight on selected tile |
| PlacementGhost | `components/interaction/PlacementGhost.tsx` | Translucent preview during build mode |

## Per-Frame Logic Pattern

Each component that needs per-frame updates uses the `useFrame` hook from R3F:

```typescript
import { useFrame } from "@react-three/fiber";

export const TreeInstances = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state, delta) => {
    // Read ECS tree entities
    // Update instance matrices for growth animation
    // Lerp scale toward target
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, maxCount]} />;
};
```

This replaces the old monolithic `engine.runRenderLoop` pattern. Benefits:
- Each component is independently testable
- No single file grows beyond manageable size
- Components can be added/removed without touching a central orchestrator

## Camera

The camera is a `PerspectiveCamera` that follows the player position with a fixed offset, giving a diorama-like view of the grove.

| Parameter | Value | Purpose |
|-----------|-------|---------|
| FOV | 50 | Moderate field of view for diorama feel |
| Position offset | Fixed above/behind player | Consistent viewing angle |
| Controls | Disabled | Player cannot rotate, pan, or zoom |

## Lighting

Two lights provide the scene's illumination, driven by the time system:

**Ambient Light** -- Soft fill from all directions.
- Intensity varies with time of day.
- Color shifts between warm (day) and cool (night).

**Directional Light (Sun)** -- Primary shadow-casting light.
- Direction rotates based on game hour.
- Diffuse color shifts through dawn/day/dusk/night.
- Intensity driven by the time system's `sunIntensity` value.

## Ground and Grid

The ground component renders:

1. **Forest floor** -- A plane mesh with biome-appropriate material, extending beyond the planting grid.
2. **Soil base** -- Flat ground covering the planting area.
3. **Grid overlay** -- Semi-transparent grid lines showing planting positions.

## Player Mesh

The player ("Fern") is built from Three.js primitives:

- **Body:** CylinderGeometry (tapered, forest green)
- **Head:** SphereGeometry (skin-toned)
- **Hat:** CylinderGeometry pieces (autumn gold)

Position is synced from the ECS player entity every frame via `useFrame`.

## Tree Rendering

Trees use Three.js `InstancedMesh` for efficient batch rendering. All trees of the same species share a single instanced draw call.

### Tree Geometry Generation

Tree meshes are generated procedurally using Three.js `BufferGeometry`, ported from the original SPS Tree Generator. The generator creates deterministic trees using seeded RNG.

Source: `src/game/utils/treeGeometry.ts`

### Species-Specific Rendering

Each of the 15 species maps to a unique rendering profile:

| Species         | Special Feature                    |
|-----------------|-------------------------------------|
| White Oak       | Standard tree                       |
| Weeping Willow  | Drooping canopy geometry            |
| Elder Pine      | Conical shape, forked trunk         |
| Cherry Blossom  | Pink canopy, falling petal overlay  |
| Ghost Birch     | Night glow (emissive material)      |
| Redwood         | Tallest tree, heavy trunk           |
| Flame Maple     | Orange-red seasonal tints           |
| Baobab          | Wide tapered trunk                  |
| Silver Birch    | +20% growth near water              |
| Ironbark        | Storm immune, 3x timber at Old Growth |
| Golden Apple    | 3x fruit yield in Autumn            |
| Mystic Fern     | +15% growth per adjacent tree       |
| Crystalline Oak | Prismatic seasonal color shifts     |
| Moonwood Ash    | Silver shimmer material             |
| Worldtree       | Largest tree, grove-wide presence   |

### Instanced Rendering

Instead of individual meshes per tree, `InstancedMesh` batches all trees of the same species into a single draw call:

```typescript
// Each species gets one InstancedMesh
<instancedMesh ref={meshRef} args={[geometry, material, maxTrees]}>
  {/* Instance matrices updated in useFrame */}
</instancedMesh>
```

- Instance transforms (position, scale, rotation) are updated per-frame in the `useFrame` hook.
- Growth animations lerp instance scale toward the target stage scale.
- Seasonal changes update material colors without recreating geometry.

### Growth Animations

Tree scaling uses frame-rate-independent lerp interpolation inside `useFrame`:

```typescript
const lerpSpeed = 3.0;
const lerpFactor = Math.min(1, delta * lerpSpeed);
const smoothedScale = currentScale + (targetScale - currentScale) * lerpFactor;
```

The `Math.min(1, dt * speed)` pattern ensures consistent animation speed regardless of frame rate.

## Day/Night Cycle

The time system (`src/game/systems/time.ts`) drives dynamic scene updates every frame:

- **Sky color** -- Transitions through dawn/day/dusk/night palettes
- **Sun direction** -- Rotates based on game hour
- **Light intensity** -- Ambient and directional lights adjust
- **Ambient color** -- Shifts between warm (day) and cool (night)

Time scale: 1 real second = 1 game minute. A full game day takes 24 real minutes.

## Seasonal Visuals

When the season changes:

1. **Ground material** -- Color shifts (green in spring, brown in autumn, white-grey in winter)
2. **Border tree canopies** -- Decorative trees change leaf colors
3. **Tree instance materials** -- Material colors update for seasonal tints
4. **Player tree mesh rebuild** -- Instance colors update to reflect the new season

## Weather Overlays

Weather effects use React Native animated overlays (not 3D particles) to minimize GPU load:

- **Rain:** Animated falling droplet elements
- **Drought:** Warm color filter overlay
- **Windstorm:** Diagonal streak animation
- **Cherry petals:** Floating petal animation (active when Cherry Blossom trees reach stage 3+)

## Border Trees

14 decorative trees placed around the grid edges to frame the grove. They use simple geometry (cylinder trunk + sphere canopy) with seeded RNG for scale variation. These trees change canopy color with the seasons but are not part of the ECS.
