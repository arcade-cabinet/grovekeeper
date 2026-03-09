# fix-W7-E: Mount EnemyMeshes into R3F Canvas

## Task
Mount the `EnemyMeshes` component (created by W7-D) into the R3F Canvas in `app/game/index.tsx`.

## Changes Made

Two lines added to `/Users/jbogaty/src/arcade-cabinet/grovekeeper/app/game/index.tsx`:

1. Import added (line 25, grouped with other entity imports):
   ```ts
   import { EnemyMeshes } from "@/components/entities/EnemyMesh";
   ```

2. JSX element added inside the Canvas `<Physics>` block, immediately after `<BirmotherMesh />`:
   ```tsx
   <EnemyMeshes />
   ```

## Verification

- `pnpm test`: 167 test suites, 4032 tests — all passed.
- `npx tsc --noEmit`: No errors attributable to `app/game/index.tsx`. Pre-existing TS5097 errors (allowImportingTsExtensions) exist across ~200+ files in the project and are unrelated to this change.

## Result

`EnemyMeshes` is now mounted in the R3F Canvas alongside the other entity renderers (`NpcScene`, `BushScene`, `BirmotherMesh`, etc.). All active ECS enemy entities will be rendered each frame via `enemiesQuery`, with health-bar billboards displayed when they are damaged.
