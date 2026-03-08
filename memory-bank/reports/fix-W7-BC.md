# Fix Report: W7-BC — Mount Missing R3F Components into Canvas

**Date:** 2026-03-07
**Agent:** W7-BC
**File modified:** `app/game/index.tsx`

---

## Summary

Mounted 5 previously unrendered components into the R3F Canvas and replaced the capsule-placeholder NPC renderer with the GLB-based NpcModel system. All components are inside the `<Canvas><Physics>` tree.

---

## Components Mounted

### 1. NpcMeshes → NpcScene (GLB ChibiCharacter assembly)

**Action:** Removed `NpcMeshes` import and `<NpcMeshes onNpcTap={onNpcTap} />` JSX. Added inline `NpcScene` function component that queries `npcsQuery.entities` and renders one `<NpcModel>` per NPC entity.

- Import added: `NpcModel` from `@/components/entities/NpcModel`
- ECS query added: `npcsQuery` from `@/game/ecs/world`
- Store read added: `worldSeed` from `useGameStore`
- NpcScene reads `entity.npc.templateId` as `npcId`, `entity.npc.function` as `role`, `entity.position` for world placement
- Note: `onNpcTap` interaction is deferred — `NpcModel` renders GLBs but does not wire pointer events; that requires a future overlay component (scene-level GLB raycasting is out of scope for this fix pass)

### 2. BushScene (seasonal bush GLBs)

**Action:** Added inline `BushScene` function component that queries `bushesQuery.entities` and renders one `<BushModel>` per bush entity.

- Import added: `BushModel` from `@/components/entities/BushModel`
- ECS query added: `bushesQuery` from `@/game/ecs/world`
- Reads `entity.bush.bushShape` and `entity.bush.season` directly from the ECS component (season is authoritative on the ECS entity, not the store's `currentSeason`)
- JSX: `<BushScene />` inside Canvas after `<PropInstances />`

### 3. HedgeMaze

**Action:** Added import and JSX.

- Import: `HedgeMaze` from `@/components/entities/HedgeMaze`
- No props needed — queries `hedgesQuery` and `hedgeDecorationsQuery` internally
- JSX: `<HedgeMaze />` inside Canvas

### 4. GrovekeeperSpirit

**Action:** Added import and JSX.

- Import: `GrovekeeperSpirit` from `@/components/entities/GrovekeeperSpirit`
- No props needed — queries `grovekeeperSpiritsQuery` internally
- Renders procedural IcosahedronGeometry orbs (no GLB)
- JSX: `<GrovekeeperSpirit />` inside Canvas

### 5. ToolViewModel

**Action:** Added import and JSX.

- Import: `ToolViewModel` from `@/components/player/ToolViewModel`
- Prop: `moveDirection={moveDirection}` (already computed by `useInput()` hook in GameScreen)
- Portals the tool GLB into the camera via R3F `createPortal` — correct for FPS held-tool rendering
- JSX: `<ToolViewModel moveDirection={moveDirection} />` inside Canvas near FPSCamera

---

## Components Already Mounted (no action needed)

These were confirmed present in the Canvas before this fix:

| Component | Import line | JSX line |
|-----------|-------------|----------|
| `StructureInstances` | 10 | `<StructureInstances />` |
| `FenceInstances` | 6 | `<FenceInstances />` |
| `PropInstances` | 9 | `<PropInstances />` |

---

## Skipped Components

None skipped. All 8 items in scope were addressed (3 already mounted + 5 newly mounted, including the NpcMeshes→NpcModel swap).

---

## Notes

- **File length:** 415 lines — exceeds the 300-line hard limit. This was pre-existing (368 lines before changes). The inline `NpcScene` and `BushScene` helpers added ~40 lines. Decomposition into a sub-package barrel is deferred per task instructions.
- **Pre-existing TypeScript errors:** `npx tsc --noEmit` surfaces ~60+ `TS5097` errors (`.tsx` extension imports without `allowImportingTsExtensions`) across many files in the repo. These are all pre-existing and unrelated to this fix. No new TS errors introduced.
- **NpcTap interaction:** `NpcMeshes` used imperative `THREE.Mesh` pointer events for `onNpcTap`. `NpcModel` renders GLB scenes without pointer event hooks. The `onNpcTap` callback from `useInteraction()` is no longer wired to NPC clicks — this is a known gap requiring a future pointer-event overlay on the GLB group.

---

## Test Results

```
Test Suites: 167 passed, 167 total
Tests:       4032 passed, 4032 total
Time:        7.01 s
```

All tests pass.

---

## Final Line Count

`app/game/index.tsx`: **415 lines** (was 368 before this session — +47 lines for inline NpcScene, BushScene helpers, imports, and store read).
