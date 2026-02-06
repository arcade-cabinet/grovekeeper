# Performance

Grovekeeper targets mobile-first performance with a secondary desktop profile. Performance budgets are enforced through architectural choices, not runtime monitoring.

## Performance Budgets

| Metric               | Target     | Achieved   | Notes                                     |
|----------------------|------------|------------|-------------------------------------------|
| FPS (mobile)         | >= 55      | Yes        | Tested on mid-range Android/iOS devices   |
| FPS (desktop)        | >= 60      | Yes        | Standard desktop browsers                 |
| Initial bundle (gz)  | < 500 KB   | ~107 KB    | Code splitting separates game scene       |
| Total game load (gz) | --         | ~500 KB    | Includes BabylonJS chunk + textures       |
| Draw calls           | < 50       | Under budget | Template cloning + frozen matrices      |
| Memory (mobile)      | < 100 MB   | Within range | Texture resolution kept at 1K           |
| Time to interactive  | < 3s       | Yes        | Main menu loads without BabylonJS         |

## Code Splitting

The largest optimization is the split between the main menu and the game scene:

```typescript
// Game.tsx - lazy import
const GameScene = lazy(() => import('./scenes/GameScene'));
```

**Initial load (~107 KB gzipped):**
- React framework
- Tailwind CSS
- Main menu UI components
- Zustand store

**Deferred game load (~400 KB gzipped):**
- BabylonJS engine and scene modules
- Procedural textures
- SPS tree generator
- PBR materials

### Manual Chunks (vite.config.ts)

BabylonJS modules are grouped into a dedicated chunk to avoid duplicating them across dynamic imports:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        babylon: [
          "@babylonjs/core/Engines/engine",
          "@babylonjs/core/scene",
          "@babylonjs/core/Cameras/arcRotateCamera",
          "@babylonjs/core/Lights/hemisphericLight",
          "@babylonjs/core/Lights/directionalLight",
          "@babylonjs/core/Maths/math.vector",
          "@babylonjs/core/Maths/math.color",
          "@babylonjs/core/Meshes/mesh",
          // ... and other mesh builders, materials, textures
        ],
      },
    },
  },
},
```

## BabylonJS Tree-Shaking

BabylonJS is imported via specific module paths, never through barrel exports:

```typescript
// Correct: specific module import
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";

// Incorrect: barrel import (would pull in the entire engine)
// import { ArcRotateCamera, CreateCylinder } from "@babylonjs/core";
```

This approach ensures only the modules actually used are included in the bundle. The BabylonJS core package is over 1 MB unminified; selective imports bring the contribution down to the ~400 KB chunk.

## Template Mesh Caching

Instead of generating a full SPS tree mesh for every tree entity, the rendering system uses a template-and-clone pattern:

1. The first tree of each species+season combination generates a full SPS template mesh.
2. Subsequent trees of the same combination are created via `template.clone()`, which is significantly cheaper than SPS generation.
3. Templates are invisible and disabled -- they exist only as clone sources.
4. When the season changes, all templates are disposed and rebuilt on demand.

Cache key format: `{speciesId}_{season}` (with `_night` suffix for Ghost Birch glow variant).

With 11 species and 4 seasons, the maximum cache size is 45 templates (11 * 4 + 1 night variant).

## Matrix Freezing

Static geometry has its world matrix frozen to skip per-frame recalculation:

**Always frozen:**
- Ground meshes
- Grid overlay
- Soil base

**Conditionally frozen:**
- Tree meshes at stage 4 (Old Growth) once their scale animation completes.
- Automatically unfrozen if the tree needs to animate again.
- `mesh.isPickable = false` is also set on frozen trees to exclude them from raycasting.

```typescript
if (treeEntity.tree.stage === 4 && !frozenTreesRef.current.has(treeEntity.id)) {
  mesh.freezeWorldMatrix();
  mesh.isPickable = false;
  frozenTreesRef.current.add(treeEntity.id);
}
```

## CSS Weather Overlays

Weather visual effects (rain, drought, windstorm) use CSS animations instead of BabylonJS's `ParticleSystem`. This avoids:

- Additional GPU draw calls for particle rendering.
- Complex particle lifecycle management.
- Bundle size increase from importing particle modules.

The CSS overlay approach adds zero draw calls and minimal CPU overhead for DOM animation.

## Render Loop Optimizations

### Debounced Saves

Grove serialization is debounced to 1 second after plant/harvest actions, preventing multiple rapid state writes:

```typescript
const debouncedSaveGrove = useCallback(() => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(saveCurrentGrove, 1000);
}, [saveCurrentGrove]);
```

### Periodic Operations

Expensive checks run on fixed intervals rather than every frame:

| Operation            | Interval     | Purpose                              |
|----------------------|-------------|--------------------------------------|
| Achievement check    | 5 seconds   | Evaluates 15 achievement triggers    |
| Time persistence     | 5 seconds   | Syncs game time to Zustand store     |
| Auto-save            | 30 seconds  | Full ECS serialization to localStorage |

### Frame-Rate-Independent Animation

Growth animations use `Math.min(1, deltaTime * speed)` as the lerp factor, ensuring consistent visual speed regardless of frame rate fluctuations:

```typescript
const lerpFactor = Math.min(1, deltaTime * lerpSpeed);
const smoothedScale = currentScale + (targetScale - currentScale) * lerpFactor;
```

## Texture Budget

PBR tree textures are sourced from AmbientCG at 1K resolution (1024x1024 JPG). Each texture set includes:

- Color map (~50-100 KB)
- Normal map (~50-100 KB)
- Roughness or opacity map (~30-50 KB)

With 5 bark sets and 2 leaf sets, the total texture budget is approximately 1 MB uncompressed, loaded on demand when the game scene initializes.

## Mobile-Specific Considerations

- **Touch events:** All touch handlers use passive event listeners where possible.
- **Canvas touch action:** `touch-action: none` on the game canvas prevents browser gestures.
- **Shadow maps:** The implementation supports 512px on mobile and 1024px on desktop (configurable).
- **Background handling:** The game auto-saves when the tab loses focus via `visibilitychange` event, and calculates offline growth when the player returns.
