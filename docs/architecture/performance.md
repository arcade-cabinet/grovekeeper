# Performance

> **PARTIALLY SUPERSEDED (2026-03-07):** Performance budgets are updated in `docs/plans/2026-03-07-unified-game-design.md` Sections 2 and 4. Key additions:
>
> - **Chunk generation budget:** <16ms per chunk (must not cause frame drops). Heavy chunks generate across 2-3 frames.
> - **Labyrinth generation budget:** <100ms (can be async/background).
> - **Vertex budget per chunk:** ~30,000 (GLB trees are 100-400 verts vs 200-1,300 for old SPS procedural).
> - **Draw call target:** <50 on mobile. Tree instancing key: `${speciesId}_${stage}_${season}`.
> - **Trees use GLB models** (not procedural SPS geometry) -- dramatically cheaper.
> - **Instanced rendering** for same-model repetitions (InstancedMesh).
> - **Visible vertices:** <30K across active chunks.
>
> The general budgets and optimization patterns below remain valid.

Grovekeeper targets mobile-first performance with a secondary desktop profile. Performance budgets are enforced through architectural choices, not runtime monitoring.

## Performance Budgets

| Metric               | Target     | Notes                                     |
|----------------------|------------|-------------------------------------------|
| FPS (mobile)         | >= 55      | Tested on mid-range Android/iOS devices   |
| FPS (desktop)        | >= 60      | Standard desktop browsers                 |
| Initial bundle (gz)  | < 500 KB   | Code splitting separates game scene       |
| Draw calls           | < 50       | InstancedMesh + frozen matrices           |
| Memory (mobile)      | < 100 MB   | Texture resolution kept at 1K             |
| Time to interactive  | < 3s       | Menu loads without 3D engine              |

## Code Splitting

Expo Router provides natural code splitting via route-based lazy loading:

```text
app/
  (menu)/index.tsx    -- Menu screen (loads immediately)
  (game)/index.tsx    -- Game screen with R3F Canvas (loads on navigation)
```

**Initial load (menu):**
- React + React Native
- NativeWind styles
- Zustand store
- Menu UI components

**Deferred game load (on navigation):**
- Three.js + React Three Fiber
- drei helpers
- Tree geometry generator
- R3F scene components

## InstancedMesh Rendering

Instead of individual meshes per tree (expensive), all trees of the same species share a single `InstancedMesh`:

```typescript
<instancedMesh ref={meshRef} args={[geometry, material, maxCount]}>
  {/* Per-instance transforms updated in useFrame */}
</instancedMesh>
```

Benefits:
- One draw call per species (instead of one per tree)
- Instance matrix updates are cheap (just setting float values in a buffer)
- With 15 species, maximum 15 draw calls for all trees combined

### Growth Animation via Instance Matrices

Growth animations update instance scale in the `useFrame` hook using frame-rate-independent lerp:

```typescript
const lerpFactor = Math.min(1, delta * lerpSpeed);
const smoothedScale = currentScale + (targetScale - currentScale) * lerpFactor;
// Update instance matrix with new scale
```

Old-Growth trees (stage 4) with stable scale can have their instance matrix updates skipped for additional savings.

## Seasonal Updates

When the season changes:
- Instance material colors update (no geometry recreation needed)
- Border tree canopy colors update
- No full mesh rebuild required -- only material uniforms change

This is a significant improvement over the previous template-cache-and-rebuild approach.

## Weather Overlays

Weather visual effects (rain, drought, windstorm) use React Native animated components instead of 3D particles:

- Zero additional draw calls
- Minimal CPU overhead for UI-layer animation
- No Three.js particle system imports needed in the bundle

## Render Optimizations

### Debounced Saves

Grove serialization is debounced to 1 second after plant/harvest actions:

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
| Auto-save            | 30 seconds  | Full ECS serialization to storage    |

### Frame-Rate-Independent Animation

All animations use `Math.min(1, delta * speed)` as the lerp factor, ensuring consistent visual speed regardless of frame rate fluctuations.

## Texture Budget

GLB models have embedded textures (packed via Blender export). Texture atlases at 128x128 or 512x512:

- Tools share `Tools_Texture.png` (128x128)
- Mega Pack uses 512x512 atlases
- Individual tree/bush/prop GLBs: 2-65 KB each with embedded textures

Total asset budget is minimal -- stylized low-poly models use intentionally small textures. Models loaded on demand per chunk.

## Mobile-Specific Considerations

- **Touch events:** Gesture handler for unified input across platforms
- **Canvas touch action:** Proper touch handling via R3F event system
- **Shadow maps:** 512px on mobile, 1024px on desktop
- **Background handling:** Auto-save on app background, offline growth on resume
- **Battery:** Minimize GPU work, cap frame rate when appropriate
- **Memory:** expo-sqlite for persistent storage instead of large localStorage blobs
