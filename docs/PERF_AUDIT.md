---
title: Performance Audit
updated: 2026-04-19
status: current
domain: quality
---

# Grovekeeper Performance Audit

## Verdict

**(a) Babylon is NOT the root cause. Our USAGE is.** Evidence is consistent
and unambiguous: no mesh instancing, per-frame GC churn in the game loop and
lighting, 54MB of 1024x1024 JPEG textures with 2MB normal maps, 25 Radix
packages dragged into the initial bundle, and a 2.4MB Babylon chunk shipped
because the HDR skybox pulls `@babylonjs/loaders`. Switching to R3F would keep
every one of these problems: R3F is just a React wrapper over three.js. The
same mesh-per-tree, same oversized textures, same Map-per-frame allocations,
same 54MB texture payload.

Confidence: high for everything except shader compile cost and actual GC pause
distribution, which need runtime tracing (see "What we can't determine
statically").

## Bundle breakdown (`pnpm build`, gzipped)

| Chunk | Raw | Gzip | Notes |
|---|---:|---:|---|
| `babylon-SA2sm78Q.js` | 2,413 KB | 588 KB | Babylon core + loaders. 3x the total-game-load budget of 600KB by itself. |
| `index-*.js` | 468 KB | 143 KB | Main app shell + Radix + framer-motion. Initial load sees this immediately. |
| `GameScene-*.js` | 335 KB | 97 KB | Lazy-loaded game chunk. OK. |
| `pbr.fragment`, `openpbr.fragment` x2 each | ~340 KB raw | ~62 KB | Shipped even though we do not use OpenPBR. |
| `pbrDebug` x2 | 72 KB raw | 15 KB | Debug shader code in prod bundle. |
| ~160 other Babylon shader chunks | ... | ... | Every fragment/vertex/uboDeclaration is a separate file. |

**Initial paint = `index` + `babylon` = ~731 KB gz. Budget is 500 KB. We are
46% over.** Total `dist/` is 75 MB; textures are 54 MB of that.

## Top 5 bottlenecks (ranked by expected impact)

### 1. Every tree is a full mesh clone, not a GPU instance
`src/game/scene/TreeMeshManager.ts:56` —
`template.clone(\`tree_\${entityId}\`, null)`. No call to
`.createInstance()` or `thinInstances` anywhere in the codebase (Grep across
`src/`: zero matches). Each tree = its own Mesh = its own draw call +
world-matrix update + culling test. With ~50 trees in a zone and 2 materials
per tree (bark + leaves), that is ~100 draw calls just for trees, blowing the
<50 budget. Fix: `createInstance()` or `thinInstances` per species+season
template. Babylon supports both; R3F would also require `InstancedMesh` —
same fix.

### 2. `LightingManager.update()` allocates 5+ objects per frame
`src/game/scene/LightingManager.ts:54, 64, 75, 82, 94, 96`. Runs inside
`startRenderLoop` (`GameScene.tsx:942`) at 60 FPS. Every frame creates 4
fresh `Color3`, 1 `Vector3`, 1 `Color4`, plus three `hexToRgb(...)` object
returns. At 60 FPS that is >= 500 short-lived objects/sec from this one
function alone. Fix: mutate existing `Color3.set(r,g,b)` and cached
`Vector3.copyFromFloats()`. No engine change required.

### 3. `growthSystem` allocates two Maps + a Set with string keys every frame
`src/game/systems/growth.ts:87-100`. `new Set<string>()`, `new Map<string,
number>()`, then builds `${gridX},${gridZ}` keys for every grid cell (~256
tiles on a 16x16 zone) and every tree. ~300 string allocations/frame ->
18,000/sec. Plus lines 98, 155, 172 allocate more keys inside per-tree loops.
Fix: pack coords into a single `number` key (`x * 1024 + z`) and reuse Maps
as class fields. No engine involved.

### 4. 54 MB of 1024x1024 JPEG textures on disk
`public/textures/` inventory: 24 JPEGs, 8 normal maps between 1.8 and 2.5 MB
each (bark003/normal.jpg = 2.57 MB, soil/normal.jpg = 2.47 MB). Dimensions
are 1024x1024 per `sips` check. That is uncompressed-ish JPEG with high
quality settings. Each texture uploaded to GPU is 4 MB (RGBA8). Eight bark
sets x 3 maps + 3 leaf sets + 3 ground sets + HDRI = ~40 textures at
4MB each GPU-side = **160 MB VRAM** just for materials, exceeding our <100MB
mobile budget. Fix: re-encode to 512x512 BasisU/KTX2 (Babylon supports it),
or at minimum JPEG quality 75, mipmaps baked in. No engine change, purely
asset work.

### 5. 25 Radix UI packages + framer-motion in initial `index` chunk
`package.json:35-60` imports 25 `@radix-ui/react-*` packages. Even if only 5
are used, the way they are imported (no sideEffects-free exports) tends to
pull all of them unless manually tree-shaken. Combined with
`framer-motion@12` (a big dependency) this is why `index` is 468 KB raw /
143 KB gz. Fix: audit actual Radix usage with Grep, remove unused; consider
`motion` (the smaller variant of framer-motion) or CSS-only animations.

## Quick wins (hours)

1. **Swap `clone()` -> `createInstance()` in `TreeMeshManager.createMesh`** —
   one-line change per species+season bucket that already has a template.
   Expect ~5x reduction in tree draw calls. (`TreeMeshManager.ts:56`)
2. **Reuse `Color3`/`Vector3` in `LightingManager.update`** — mutate
   instead of `new`. (`LightingManager.ts:47-97`)
3. **Hoist `waterTiles`/`treeCounts` Maps out of `growthSystem`** — store as
   module-scope or on a system context, `.clear()` each frame. Use numeric
   keys. (`growth.ts:87`)
4. **Engine pixel ratio clamp** — there is no `engine.setHardwareScalingLevel`
   anywhere. On a 3x retina phone we're rendering 9x the fragments. Add
   `engine.setHardwareScalingLevel(window.devicePixelRatio > 2 ? 1.5 : 1)`.
   (`SceneManager.ts:25`)
5. **Kill `pbrDebug` chunks** — import PBR from
   `@babylonjs/core/Materials/PBR/pbrMaterial` only (already done) but the
   debug symbols still ship. Add rollup `define` to strip.
6. **Re-encode textures at 512x512 q75** — mechanical pass with `sips` or
   `sharp`; will drop 54MB -> ~6MB on disk and 160MB -> 20MB VRAM.
7. **`freezeNormals()` + `doNotSyncBoundingInfo`** on cloned trees after
   stage 4; we freeze the world matrix but leave bounding info live.
   (`TreeMeshManager.ts:119`)

## Medium wins (days)

1. **Thin instances for ground tiles, border trees, and any prop repeated
   >4x.** BorderTreeManager and PropFactory create individual meshes with
   individual materials (`PropFactory.ts:28, 56, 59, 92, 95, 106, 119...`
   — 20+ `new StandardMaterial` calls per prop factory). Converting to thin
   instances + a shared material atlas is the single biggest win after
   textures.
2. **Material atlas.** Grep finds 40+ `new StandardMaterial` / `new
   PBRMaterial` call sites; each unique material = separate draw call. Bake
   bark/leaf/ground variants into one atlas + UV offsets.
3. **Split Babylon chunk.** `babylon-SA2sm78Q.js` is 2.4 MB because it
   pulls loaders + HDR + SPS + particle system. Move HDR skybox behind a
   dynamic `import()` (it's only needed after scene is up); strip
   OpenPBR/flowGraph/pbrDebug via `manualChunks` or side-effect-free reimport.
   Target: 1.2 MB / 300 KB gz for the initial Babylon payload.
4. **Replace 25 Radix packages with 5.** Most dialogs, toggles, sliders are
   one-off uses; shadcn recipes can be inlined.
5. **Fix SPS generator's per-template `new Vector3` churn.**
   `spsTreeGenerator.ts:41, 43, 406, 467, 506` allocate inside the shape
   factory. Runs only at template build time, but each season change
   rebuilds every template (`TreeMeshManager.rebuildAll`), so it matters.

## Would R3F help?

Per bottleneck, honest answer:

| # | Bottleneck | R3F fixes it? |
|---|---|---|
| 1 | No instancing | **No.** Same work with `<instancedMesh>` / `<Merged>`. |
| 2 | Per-frame `new Color3` | **No.** Same trap with `new THREE.Color`. |
| 3 | GC in growth system | **No.** Pure JS, engine-agnostic. |
| 4 | 54MB textures | **No.** Same VRAM on any WebGL renderer. |
| 5 | Radix+framer bloat | **No.** UI layer is identical. |
| - | Bundle size | **Partial.** three.js is ~600 KB (vs Babylon 2.4 MB). This is R3F's only genuine win, ~1.8 MB saved. |

**One real R3F advantage: smaller renderer.** three.js is ~600 KB minified vs
Babylon's full 2.4 MB. If the project does not use Babylon-specific features
(SPS, NodeMaterial, flowGraph, gizmos, GUI), shipping three.js would cut the
engine payload by ~1.8 MB raw / ~400 KB gz. That is a real win but does not
address frame time, draw calls, VRAM, or GC — the things the user is actually
feeling as "massive performance issues."

**Recommendation:** do NOT pivot. Spend 2-3 days on the Quick Wins above.
Measure. If you are still >16 ms/frame on mobile after instancing, texture
re-encode, and pixel-ratio clamp, THEN reconsider engines with data in hand.

## What we can't determine statically

- **Actual frame time breakdown.** Need `performance.mark` or
  `Spector.js` to see whether GPU or CPU is the bottleneck.
- **Shader compile cost on first tree.** Babylon's `PBRMaterial` compiles a
  monster ubershader; first placement stutter is likely, but we cannot
  measure size/time without running the build.
- **GC pause distribution.** The allocation patterns flagged above will
  cause GC, but whether pauses show up as frame hitches or get absorbed by
  generational GC depends on the browser. `about:tracing` or Chrome perf
  trace would confirm.
- **Draw call count in practice.** Spec says <50 achieved; static analysis
  says trees alone should be ~100. Either the active zone has very few
  trees or the claim is stale. Need Spector.js capture.
- **Mobile vs desktop gap.** The 54MB texture upload cost dominates first-
  frame on mobile but is invisible on desktop. Need real device numbers.
