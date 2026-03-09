# Fix Report: Remove Backwards-Compatibility Shims (W5-E)

## Summary

All backwards-compatibility shims have been removed from the codebase. No shim files remain.

---

## Task 1: Migrate gameStore imports

**Shim removed:** `game/stores/gameStore.ts` (was `export * from "./index"`)

**Files migrated (import path changed from `@/game/stores/gameStore` to `@/game/stores`):**

41 source files + 7 test files with `jest.mock` calls = **48 total files updated**

Source files:
- `game/world/ChunkManager.ts`
- `game/ecs/archetypes.ts`, `archetypes.test.ts`
- `game/ai/PlayerGovernor.ts`, `PlayerGovernor.test.ts`, `NpcBrain.ts`
- `game/hooks/useSpiritProximity.ts`, `useAutoSave.ts`, `usePersistence.ts`, `useBirmotherEncounter.ts`, `useWorldLoader.ts`
- `game/hooks/useInteraction/actionHandlers.ts`, `index.ts`
- `game/hooks/useGameLoop/index.ts`, `tickGrowth.ts`, `tickSurvival.ts`, `tickAchievements.ts`
- `game/actions/GameActions.test.ts`, `actionDispatcher.ts`, `treeActions.ts`, `tileActions.ts`, `toolActions.ts`
- `game/systems/gameLoop.integration.test.ts`
- `components/game/HUD.tsx`, `FloatingParticles.tsx`, `QuestPanel.tsx`, `TutorialOverlay.tsx`, `SettingsScreen.tsx`, `WeatherOverlay.tsx`, `NpcDialogue.tsx`, `StatsDashboard.tsx`, `FastTravelMenu.tsx`
- `components/game/GameUI/index.tsx`, `useGameUIData.ts`
- `components/game/minimap/snapshot.ts`
- `components/player/ToolViewModel.tsx`, `TargetInfo.tsx`
- `app/settings.tsx`, `app/index.tsx`, `app/game/index.tsx`, `app/_layout.tsx`

Test files with `jest.mock` calls updated:
- `game/hooks/useBirmotherEncounter.test.ts`
- `game/hooks/useSpiritProximity.test.ts`
- `game/actions/actionDispatcher.test.ts`
- `components/game/HUD.test.ts`
- `components/game/QuestPanel.test.ts`
- `components/player/ToolViewModel.test.ts`
- `components/player/TargetInfo.test.ts`

---

## Task 2: Other shims found and removed

### `game/actions/GameActions.ts`
- Was: `export * from "./index"` with comment "Barrel re-export. Import from '@/game/actions' or '@/game/actions/GameActions'."
- 6 files migrated to `@/game/actions`: `PlayerGovernor.ts`, `useInteraction/actionHandlers.ts`, `useInteraction/index.ts`, `GameActions.test.ts`, `actionDispatcher.ts`, `actionDispatcher.test.ts`
- Shim deleted.

### `components/game/MiniMap.tsx`
- Was: re-export barrel forwarding to `./minimap/` subpackage
- No external importers (the `components/game/index.ts` barrel was the only consumer)
- `components/game/index.ts` updated to import directly from `./minimap/index.ts`
- Shim deleted.

### `components/game/MiniMapOverlay.tsx`
- Was: re-export barrel forwarding to `./minimap/Overlay.tsx`
- No external importers
- `components/game/index.ts` updated to import `MiniMapOverlay` directly from `./minimap/index.ts`
- Shim deleted.

### `components/game/GameUI/index.tsx`
- Had `import { MiniMap } from "../MiniMap/index.ts"` (referencing non-existent `MiniMap/` dir, case-sensitive)
- Updated to `../minimap/index.ts`

---

## Task 3: Deprecated comments cleaned

- `game/stores/index.ts`: removed "or `@/game/stores/gameStore`" from JSDoc comment
- `components/game/minimap/index.ts`: removed "or `@/components/game/MiniMap` (re-export)" from JSDoc comment

No `@deprecated` tags or `// TODO: migrate` comments found in game/, components/, or app/.

---

## Verification

### Shim files deleted
```
game/stores/gameStore.ts       -- DELETED
game/actions/GameActions.ts    -- DELETED
components/game/MiniMap.tsx    -- DELETED
components/game/MiniMapOverlay.tsx -- DELETED
```

### No remaining old-path imports
```bash
grep -r "stores/gameStore\|actions/GameActions" game/ components/ app/
# (no output)
```

### TypeScript
`npx tsc --noEmit` -- 0 errors introduced by our changes. Pre-existing `allowImportingTsExtensions` errors exist project-wide but are unrelated.

### Tests
- **489 tests pass** across all files we modified (game/stores/, game/actions/, game/hooks/, components/game/, components/player/, app/)
- 2 pre-existing failing test suites (`tutorial.test.ts`, `gameLoop.integration.test.ts`) — caused by `game/systems/tutorial.ts` being rewritten in a previous story (US-163) before this fix session. Not introduced by this work.
