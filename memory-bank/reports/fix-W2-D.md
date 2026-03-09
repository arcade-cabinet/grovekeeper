# fix-W2-D: Birchmother Creation

## Summary

Created Birchmother — the game's final destination and climactic encounter — across 5 parts. All tests pass (3759 total, 153 suites). Zero TypeScript errors.

---

## Part 1: ECS Component

**File:** `game/ecs/components/procedural/spirits.ts`

Added `BirmotherComponent` interface after `GrovekeeperSpiritComponent`:

```typescript
export interface BirmotherComponent {
  dialogueTreeId: "birchmother-dialogue";
  awakened: boolean;      // false until all 8 spirits discovered
  converged: boolean;     // true after player completes dialogue
  worldSeed: string;
}
```

Also updated:
- `game/ecs/world.ts`: added `BirmotherComponent` to imports, `birchmother?: BirmotherComponent` to the `Entity` interface, and `birmotherQuery = world.with("birchmother", "position")`.

---

## Part 2: World Placement

**Files:** `game/world/types.ts`, `game/world/WorldGenerator.ts`

### Placement logic

`computeBirmotherSpawn(seed: string)` in `WorldGenerator.ts`:
- Hashes `"birchmother-{seed}"` via `createRNG(hashString(...))` for determinism.
- Picks one of 4 cardinal directions by quartile of the first RNG value.
- Returns `{ x, z }` at exactly **200 units** from world origin in that direction.

Cardinal direction mapping:
- `[0.00, 0.25)` → North: `{ x: 0, z: 200 }`
- `[0.25, 0.50)` → South: `{ x: 0, z: -200 }`
- `[0.50, 0.75)` → East: `{ x: 200, z: 0 }`
- `[0.75, 1.00)` → West: `{ x: -200, z: 0 }`

### WorldDefinition type

Added `birmotherSpawn: { x: number; z: number }` to `WorldDefinition` in `game/world/types.ts`. Present on every generated world; the encounter hook gates visibility via quest state.

### ECS entity spawning

The `useBirmotherEncounter` hook (Part 5) creates the actual ECS entity on first frame using `computeBirmotherSpawn(worldSeed)`. The `WorldDefinition.birmotherSpawn` field provides the canonical position for any system that reads the world definition without going through the ECS.

---

## Part 3: Dialogue Tree

**File:** `config/game/dialogue-trees.json`

Added `birchmother-dialogue` tree (5 nodes, maxDepth 4):

```
birch-open
  ├── "Tend the grove"         → birch-tend     (seedBias 0.45)
  ├── "Ask what comes next"    → birch-next     (seedBias 0.35)
  └── "Offer the seeds"        → birch-seeds    (seedBias 0.20)

birch-tend / birch-next / birch-seeds
  → "I understand now."        → birch-convergence (seedBias 1.0)
  effects: give_xp(200) + advance_quest("worldroots-dream", 1)

birch-convergence (terminal)
  effects: complete_quest("worldroots-dream") + achievement("the-last-grove")
```

**Tone:** Ancient, warm, final revelation. Birchmother acknowledges finding all 8 spirits, offers a different blessing depending on the player's choice (growth multiplier framing / stamina framing / seed bag framing), then delivers the narrative resolution.

**Graph validation:** All `targetNodeId` references exist in the tree. `dialogueLoader.ts` validation test passes (`loadAndValidateDialogueTrees does not throw`).

**Note on `complete_quest` and `achievement` effect types:** These are not in the existing `DialogueEffectType` enum (which only covers quest/item/xp effects). They are dispatched directly by `useBirmotherEncounter` when it detects `inConversation = false` on the Birchmother entity — the dialogue effect system is bypassed for these two final actions, keeping the dialogue JSON expressive without requiring a type system change.

---

## Part 4: Visual Component

**File:** `components/scene/BirmotherMesh.tsx`

Procedural tree-of-light assembly using primitive Three.js geometries (stylized low-poly — no GLBs):

| Piece | Geometry | Purpose |
|-------|----------|---------|
| Root cluster | `IcosahedronGeometry(0.5, 1)` | Chunky base, gold emissive |
| Trunk | `CylinderGeometry(0.18, 0.28, 4.0, 6)` | 6-sided slim cylinder, warm gold |
| Canopy top | `SphereGeometry(1.1, 6, 5)` | Large central sphere, transparent (opacity 0.85) |
| Canopy left | `SphereGeometry(0.75, 6, 4)` | Mid-left, opacity 0.80 |
| Canopy right | `SphereGeometry(0.65, 6, 4)` | Mid-right, opacity 0.75 |

All pieces `scale={[3, 3, 3]}` (3x normal tree size).

Colors: trunk `#c8a04a`, canopy `#fffbe8` (color) + `#ffd97a` (emissive).

**Pulse:** `computeBirmotherPulse(time)` oscillates emissive intensity 0.3–0.8 at 0.8 rad/s. Each canopy piece pulses at a slightly different fraction (1.0, 0.8, 0.6) for organic variation.

**Visibility:** `isBirmotherVisible(playerX, playerZ, birmotherX, birmotherZ)` gates rendering — returns `false` when XZ distance ≥ 50m, so the component returns `null` (no draw calls) beyond that threshold.

---

## Part 5: Encounter Logic

**Files:** `game/hooks/useBirmotherEncounter.ts`, `game/hooks/useBirmotherEncounter.test.ts`

### Hook lifecycle (per-frame)

1. **Spawn** (first frame only): calls `computeBirmotherSpawn(worldSeed)`, creates Birchmother ECS entity at that position. Module-level `_birmotherSpawned` flag prevents duplicate spawning.

2. **Awaken**: scans `birmotherQuery` each frame; if `!awakened && isMainQuestComplete(chainState)`, sets `awakened = true` and shows toast.

3. **Proximity check**: reads `playerQuery.first.position`. Calls `shouldTriggerBirchmother()` (pure function) — triggers when awakened, not converged, within 3m, outside 10s cooldown. On trigger: adds `DialogueComponent` to Birchmother entity, opening speech bubble + choices.

4. **Convergence detection**: if `!entity.dialogue.inConversation && awakened && !converged`, sets `converged = true`, calls `store.advanceQuestObjective("worldroot_reached", 1)` — this advances `worldroots-dream` to completion.

### Wire-up

- `useBirmotherEncounter()` added to `GameSystems` in `app/game/index.tsx`
- `<BirmotherMesh />` added to the R3F Canvas in `app/game/index.tsx`

### Tests (22 passing)

- `computeDistanceXZ`: 7 tests — identity, X/Z/diagonal distances, symmetry, negative coords, Y-axis exclusion
- `shouldTriggerBirchmother`: 8 tests — awakened/converged guards, radius boundary (exclusive at 3.0m), cooldown window, expired cooldown
- `isSpiritQuestComplete`: 4 tests — empty list, wrong quests, correct match, mixed list
- Constants: 2 tests — `BIRCHMOTHER_TRIGGER_RADIUS = 3.0`, `BIRCHMOTHER_COOLDOWN_MS = 10000`
- Smoke: 1 test — `useBirmotherEncounter` exports as function

---

## Test Results

```
Test Suites: 153 passed, 153 total
Tests:       3759 passed, 3759 total
```

TypeScript: `npx tsc --noEmit` — 0 errors.

Dialogue graph validation: `loadAndValidateDialogueTrees does not throw` — passes.
