# fix-W2-G: MiniMap Markers + GamepadProvider

Date: 2026-03-07

---

## FIX-30: Labyrinth + Spirit Markers on MiniMap

### Files changed
- `components/game/minimap/types.ts` — Added `MinimapLabyrinth` and `MinimapSpirit` interfaces; added `labyrinths` and `spirits` fields to `MinimapSnapshot`.
- `components/game/minimap/colors.ts` — Added 4 new color constants: `LABYRINTH_UNEXPLORED_COLOR` (#9E9E9E grey), `LABYRINTH_EXPLORED_COLOR` (#FFD700 gold), `SPIRIT_UNDISCOVERED_COLOR` (#5C6BC0 indigo), `SPIRIT_DISCOVERED_COLOR` (#E040FB purple).
- `components/game/minimap/snapshot.ts` — Extended `BuildSnapshotParams` with `labyrinthEntities` and `spiritEntities`. Updated `buildMinimapSnapshot` to filter both arrays by view bounds. Updated `readMinimapSnapshot` (ECS adapter) to scan `terrainChunksQuery` with `isLabyrinthChunk()` for labyrinth detection, and `grovekeeperSpiritsQuery` for spirit positions, deriving `discovered` from `store.discoveredSpiritIds`.
- `components/game/minimap/MinimapSVG.tsx` — Added labyrinth rendering (4-point diamond polygon, grey/gold with opacity), spirit rendering (✦ unicode character via SvgText, dim/bright). Updated accessibilityLabel.
- `components/game/minimap/Overlay.tsx` — Added `LABYRINTH_EXPLORED_COLOR` and `SPIRIT_DISCOVERED_COLOR` legend items.
- `components/game/minimap/index.ts` — Exported `MinimapLabyrinth` and `MinimapSpirit` types.
- `components/game/MiniMap.tsx` — Re-export barrel updated to expose new types.

### Marker types
| Marker | Shape | Unexplored/Undiscovered | Explored/Discovered |
|--------|-------|------------------------|---------------------|
| Labyrinth | ◆ diamond polygon | Grey (#9E9E9E), 60% opacity | Gold (#FFD700), full opacity |
| Spirit | ✦ 4-pointed star (SvgText) | Indigo (#5C6BC0), 50% opacity | Purple (#E040FB), full opacity |

### Data source
- **Labyrinths**: Scan `terrainChunksQuery` (active ECS terrain chunks), call `isLabyrinthChunk(worldSeed, chunkX, chunkZ)` on each. Center = `chunkX * CHUNK_SIZE + CHUNK_SIZE/2`. `explored` = chunk key present in `store.discoveredChunks`.
- **Spirits**: Query `grovekeeperSpiritsQuery` (ECS entities with `grovekeeperSpirit` + `position`). `discovered` = `store.discoveredSpiritIds.includes(spirit.spiritId)`.

### Tests
`components/game/minimap/snapshot.test.ts` — 12 new tests in 2 new suites:
- "labyrinth markers": include/exclude by range, explored flag true/false, multiple, empty default
- "spirit markers": include/exclude by range, discovered flag true/false, spiritId preservation, multiple, empty default

---

## FIX-32: GamepadProvider

### Files created
- `game/input/GamepadProvider.ts` — Implements `IInputProvider` using `navigator.getGamepads()`.
- `game/input/GamepadProvider.test.ts` — 29 tests.

### Button mapping
| Button | Index | Action |
|--------|-------|--------|
| A | 0 | `jump` |
| X | 2 | `interact` |
| LB | 4 | `toolSwap = -1` (previous tool) |
| RB | 5 | `toolSwap = +1` (next tool) |

### Axis mapping
| Axis | Source | Output |
|------|--------|--------|
| 0 | Left stick X | `moveX` |
| 1 | Left stick Y (inverted) | `moveZ` (negative = backward) |
| 2 | Right stick X | `lookDeltaX` (scaled by `LOOK_SENSITIVITY * dt`) |
| 3 | Right stick Y | `lookDeltaY` (scaled by `LOOK_SENSITIVITY * dt`) |

Dead-zone: `|value| <= 0.12` → 0. Look sensitivity: 2.5 rad/s at full deflection.

Gamepad tracking via `gamepadconnected` / `gamepaddisconnected` event listeners registered in constructor, cleaned up in `dispose()`. Picks up pre-connected gamepads in constructor by scanning `navigator.getGamepads()`.

### Test results
- `pnpm test game/input/GamepadProvider` → 29/29 pass
- `pnpm test components/game/minimap/snapshot` → 25/25 pass (13 existing + 12 new)
- `npx tsc --noEmit` → 0 errors in scope (pre-existing `actionDispatcher.ts` errors unrelated to this work)
