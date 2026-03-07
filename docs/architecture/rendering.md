# Rendering Architecture

> **PARTIALLY SUPERSEDED (2026-03-07):** Several rendering details have changed. See `docs/plans/2026-03-07-unified-game-design.md` Sections 2 and 5. Key corrections:
>
> - **Trees use 3DPSX GLB models** (8 base + 6 winter variants), not procedural SPS geometry. Growth = scale per stage. ~50 lines replaces 951-line SPS generator.
> - **NPCs use 3DPSX ChibiCharacter GLBs** with anime.js Lego-style animation, not procedural box primitives.
> - **First-person perspective** -- no visible player mesh. Player IS the camera with Rapier capsule collider.
> - **No BorderTrees component** -- border/decorative trees are GLB instances, same as planted trees.
> - **Instanced rendering keys:** `${speciesId}_${stage}_${season}[_night]` for trees.
> - **Vertex budget:** ~30,000 per visible chunk (see unified doc Section 2).
> - **Seasonal bushes:** 262 3DPSX GLBs (52 shapes x 5 seasons), swap GLB on season change.
>
> The R3F declarative architecture, useFrame pattern, instanced mesh approach, and day/night cycle remain accurate.

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

## Player

First-person perspective -- the player IS the camera. No visible player mesh. A Rapier KinematicCharacterController capsule handles collision. The camera sits at eye height (1.6 units) inside the capsule. See `docs/architecture/fps-camera.md` for details.

## Tree Rendering

Trees use Three.js `InstancedMesh` for efficient batch rendering. All trees of the same species share a single instanced draw call.

### Tree Models (3DPSX GLBs)

Trees use pre-made 3DPSX GLB models, not procedural geometry. 8 retro nature tree silhouettes + 72 tree_pack_1.1 models mapped to 15 species. Growth stages are scale-based:

| Stage | Name | Approach |
|-------|------|----------|
| 0 | Seed | Tiny hardcoded geometry (cone + sphere, ~20 verts) |
| 1 | Sprout | Hardcoded geometry (cylinder + triangles, ~30 verts) |
| 2 | Sapling | Species GLB at 0.5x scale |
| 3 | Mature | Species GLB at 1.0x scale |
| 4 | Old Growth | Species GLB at 1.3x scale + Y-axis squash (0.95) |

Seasonal variation: winter variant GLB swap (6 models) or material color tint uniform. Seeded rotation + scale jitter (0.85x-1.15x) for natural variation.

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

## Decorative / Background Trees

In the infinite world, decorative trees are the same GLB models used for planted trees, placed via procedural scatter during chunk generation. They use `InstancedMesh` for efficient batch rendering and are NOT individual ECS entities. They change appearance via seasonal GLB swap or color tint uniform, same as interactive trees.
