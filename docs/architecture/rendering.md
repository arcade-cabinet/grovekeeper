# Rendering Architecture

Grovekeeper's 3D rendering is handled by BabylonJS 8.50.x in an imperative (not declarative) style. Scene management is split across 8 specialized managers in `src/game/scene/`, coordinated by `GameScene.tsx` (~400 lines).

## Scene Decomposition

The rendering architecture was refactored from a monolithic `GameScene.tsx` (~1050 lines) into modular managers:

| Manager | File | Responsibility |
|---------|------|---------------|
| SceneManager | `SceneManager.ts` | Engine + Scene creation/disposal |
| CameraManager | `CameraManager.ts` | Orthographic diorama camera, viewport scaling |
| LightingManager | `LightingManager.ts` | Hemisphere + directional lights, day/night sync |
| GroundBuilder | `GroundBuilder.ts` | DynamicTexture biome blending, grid overlay |
| SkyManager | `SkyManager.ts` | HDRI skybox + IBL environment |
| PlayerMeshManager | `PlayerMeshManager.ts` | Player mesh lifecycle (create, update, dispose) |
| TreeMeshManager | `TreeMeshManager.ts` | Tree mesh lifecycle, template cache, growth lerp |
| BorderTreeManager | `BorderTreeManager.ts` | Decorative border trees outside playable grid |

`GameScene.tsx` instantiates these managers in a `useEffect` hook and calls their methods from the game loop.

## Scene Initialization

The BabylonJS Engine and Scene are created via `SceneManager.initialize()` with async dynamic imports:

```typescript
const initBabylon = async () => {
  const { Engine } = await import("@babylonjs/core/Engines/engine");
  const { Scene } = await import("@babylonjs/core/scene");
  // ...
};
```

Dynamic imports enable code splitting -- the BabylonJS chunk loads only when the player enters the game scene, not on the main menu.

### Engine Configuration

```typescript
const engine = new Engine(canvasRef.current, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  antialias: true,
});
```

## Camera

Managed by `CameraManager`. The camera is a locked orthographic `ArcRotateCamera` that gives a fixed diorama view:

| Parameter | Value            | Purpose                          |
|-----------|------------------|----------------------------------|
| alpha     | `-Math.PI / 4`   | 45-degree horizontal rotation    |
| beta      | `Math.PI / 3.5`  | ~51-degree tilt for diorama feel |
| radius    | `18`             | Fixed zoom distance              |
| target    | Grid center      | Centered on the planting grid    |

All camera inputs are cleared -- the player cannot rotate, pan, or zoom. The camera is purely observational.

## Lighting

Managed by `LightingManager`. Two lights work together for a warm, natural look:

**Hemisphere Light** -- Soft ambient fill from above.
- Intensity varies with time of day (from `time.ts` ambient intensity).
- Ground color tinted warm for natural bounce light.

**Directional Light (Sun)** -- Primary shadow-casting light.
- Direction rotates based on game hour to simulate sun movement.
- Diffuse color shifts through the day (warm at dawn/dusk, neutral at noon, cool at night).
- Intensity driven by the time system's `sunIntensity` value.

## Ground and Grid

Managed by `GroundBuilder`. The scene has three ground layers:

1. **Forest floor** -- A `CreateGround` mesh with `GrassProceduralTexture` using soil-toned colors. Extends 4 units beyond the planting grid in each direction.
2. **Soil base** -- A flat ground covering the planting area with a dark soil material.
3. **Grid overlay** -- A wireframe ground at slight elevation showing the planting grid lines. Alpha 0.3 for subtle visibility.

## Player Mesh

Managed by `PlayerMeshManager`. The farmer ("Fern") is built from BabylonJS primitives:

- **Body:** Cylinder (tapered, forest green)
- **Head:** Sphere (skin-toned, parented to body)
- **Hat brim:** Flat cylinder (autumn gold, parented to body)
- **Hat top:** Tapered cylinder (autumn gold, parented to body)

Position is synced from the ECS player entity every frame.

## Tree Rendering

Managed by `TreeMeshManager` (template caching, cloning, growth animation) with mesh generation delegated to `treeMeshBuilder.ts`.

### SPS Tree Generator

Tree meshes use a ported version of the BabylonJS Extensions SPS Tree Generator, rewritten in TypeScript with seeded RNG support. The generator creates procedural trees using BabylonJS's Solid Particle System.

Source: `src/game/utils/spsTreeGenerator.ts`

### Species-Specific Meshes

Each of the 15 species (12 base + 3 prestige) maps to a unique rendering profile in `src/game/utils/treeMeshBuilder.ts`:

| Species         | Bark Texture | Leaf Texture | Special Feature                    |
|-----------------|-------------|-------------|-------------------------------------|
| White Oak       | Oak bark    | Broad leaf  | Standard tree                       |
| Weeping Willow  | Smooth bark | Feathery    | Drooping canopy strands             |
| Elder Pine      | Rugged bark | Feathery    | Conical shape, forked trunk         |
| Cherry Blossom  | Smooth bark | Broad leaf  | Pink canopy, falling petal overlay  |
| Ghost Birch     | Birch bark  | Broad leaf  | Night glow variant (emissive)       |
| Redwood         | Thick bark  | Broad leaf  | Tallest tree, heavy trunk           |
| Flame Maple     | Oak bark    | Broad leaf  | Orange-red seasonal tints           |
| Baobab          | Thick bark  | Broad leaf  | Wide tapered trunk                  |
| Silver Birch    | Birch bark  | Broad leaf  | +20% growth near water              |
| Ironbark        | Rugged bark | Broad leaf  | Storm immune, 3x timber at Old Growth |
| Golden Apple    | Oak bark    | Broad leaf  | 3x fruit yield in Autumn            |
| Mystic Fern     | Smooth bark | Broad leaf  | +15% growth per adjacent tree       |
| Crystalline Oak | Birch bark  | Broad leaf  | Prismatic seasonal color shifts     |
| Moonwood Ash    | Smooth bark | Feathery    | Silver shimmer material             |
| Worldtree       | Thick bark  | Broad leaf  | Largest tree, grove-wide presence   |

StandardMaterial (not PBR) is used with textures from `/public/textures/trees/` for color, normal, and roughness/opacity maps.

### Template Mesh Caching

To avoid rebuilding expensive SPS meshes for every tree, templates are cached by species + season:

```typescript
const cacheKey = `${speciesId}_${season}${nightSuffix}`;
let template = templateCacheRef.current.get(cacheKey);

if (!template) {
  template = buildSpeciesTreeMesh(scene, ...);
  template.isVisible = false;
  template.setEnabled(false);
  templateCacheRef.current.set(cacheKey, template);
}

const mesh = template.clone(`tree_${id}`, null);
```

- Templates are invisible and disabled (never rendered).
- `Mesh.clone()` is cheap compared to full SPS tree generation.
- Cache is cleared when the season changes, forcing a rebuild with updated seasonal tints.
- Ghost Birch night variant uses a `_night` suffix in the cache key for its emissive glow material.

### Growth Animations

Tree scaling uses frame-rate-independent lerp interpolation:

```typescript
const lerpSpeed = 3.0;
const lerpFactor = Math.min(1, deltaTime * lerpSpeed);
const smoothedScale = currentScale + (targetScale - currentScale) * lerpFactor;
```

The `Math.min(1, dt * speed)` pattern ensures consistent animation speed regardless of frame rate. Target scale comes from the growth system's `getStageScale()` function, which smoothly previews partial progress toward the next stage.

### Matrix Freezing

Trees at stage 4 (Old Growth) with stable scale have their world matrix frozen for performance:

```typescript
if (treeEntity.tree.stage === 4 && !frozenTreesRef.current.has(treeEntity.id)) {
  mesh.freezeWorldMatrix();
  mesh.isPickable = false;
  frozenTreesRef.current.add(treeEntity.id);
}
```

Frozen matrices are unfrozen if the tree needs to animate again (unlikely for Old Growth).

## Day/Night Cycle

The time system (`src/game/systems/time.ts`) drives dynamic scene updates every frame:

- **Sky color** -- `scene.clearColor` transitions through dawn/day/dusk/night palettes.
- **Sun direction** -- Rotates based on game hour.
- **Light intensity** -- Hemisphere and directional lights adjust intensity.
- **Ambient color** -- Scene ambient color shifts between warm (day) and cool (night).

Time scale: 1 real second = 1 game minute. A full game day takes 24 real minutes.

## Seasonal Visuals

When the season changes, the scene updates:

1. **Ground material** -- Diffuse color shifts (green in spring, brown in autumn, white-grey in winter).
2. **Border tree canopies** -- Decorative trees around the grid change leaf colors.
3. **Template cache clear** -- All cached tree templates are disposed and rebuilt with new seasonal tints.
4. **Player tree mesh rebuild** -- Every planted tree mesh is disposed and recreated with the new season's colors, preserving its current scale.

## Weather Overlays

Weather effects use CSS overlays (not BabylonJS ParticleSystem) to minimize GPU load:

- **Rain:** CSS animation of falling droplet lines.
- **Drought:** Warm color filter overlay.
- **Windstorm:** Diagonal streak animation.
- **Cherry petals:** Floating petal animation (active when Cherry Blossom trees reach stage 3+).

The overlay system is controlled via `setWeatherVisual()` and `setShowPetals()` functions exported from `WeatherOverlay.tsx`.

## Border Trees

Managed by `BorderTreeManager`. 14 decorative trees are placed around the grid edges to frame the grove. They use simple primitive meshes (cylinder trunk + sphere canopy) with seeded RNG for scale variation. These trees change canopy color with the seasons but are not part of the ECS.
