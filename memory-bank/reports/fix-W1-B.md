# Fix W1-B — Spirit Dialogue Trees + Missing Quest Chains

**Date:** 2026-03-07
**Fixes:** FIX-14 (8 spirit dialogue trees), FIX-25 (5 missing quest chains)
**Files modified:**
- `config/game/dialogue-trees.json` — added 8 spirit trees (was 3, now 11)
- `game/quests/data/questChains.json` — added 5 quest chains (was 10, now 15)

---

## FIX-14: 8 Spirit Dialogue Trees

All 8 trees written to `config/game/dialogue-trees.json`. Each tree uses the
exact `DialogueTree` schema loaded by `dialogueLoader.ts`:
`{ treeId, entryNodeId, maxDepth, nodes[] }` where each node has
`{ nodeId, speaker, text, branches[], effects? }` and each branch has
`{ label, targetNodeId, seedBias, conditions? }`.

### Spirit Tree Index

| Tree ID | Personality | Species Unlocked | Nodes |
|---------|-------------|-----------------|-------|
| `spirit-dialogue-0` | Ancient | `ghost-birch` | 7 |
| `spirit-dialogue-1` | Playful | `cherry-blossom` | 6 |
| `spirit-dialogue-2` | Sorrowful | `weeping-willow` | 6 |
| `spirit-dialogue-3` | Wise | `elder-pine` | 6 |
| `spirit-dialogue-4` | Curious | `silver-birch` | 6 |
| `spirit-dialogue-5` | Protective | `ironbark` | 8 |
| `spirit-dialogue-6` | Mischievous | `flame-maple` | 6 |
| `spirit-dialogue-7` | Serene | `mystic-fern` | 7 |

### Design Notes

- Each tree has 3 opening branch choices with seedBias summing to 1.0
- All paths eventually converge to a gift node with `unlock_species` + `give_xp` effects
- Spirit 2 (sorrowful) has two distinct terminal gift nodes (`s2-comfort`, `s2-hope`) — both unlock weeping-willow via different emotional paths
- Spirit 5 (protective) has a `s5-dismiss` terminal for players who decline commitment
- `unlock_species` effects reference species IDs that exist in `config/game/species.json`
- `give_xp` on gift nodes: 50 XP each; intermediate nodes: 15-25 XP
- Branch conditions are intentionally absent from these trees — spirits are accessible regardless of player state (conditions can be added in a later pass if needed)

### Graph Validation

Python-based graph validation (same logic as `validateDialogueTree`) confirmed
zero broken node references before committing. All `entryNodeId` and all
`branch.targetNodeId` values resolve to existing nodes within their tree.

---

## FIX-25: 5 Missing Quest Chains

Added to `game/quests/data/questChains.json`. All 5 chains follow the existing
schema exactly: `{ id, name, description, icon, category, npcId, requiredLevel, steps[] }`
where each step has `{ id, name, description, npcDialogueId, objectives[], reward }`.

### Quest Chain Index

| Chain ID | NPC | Category | Steps | Theme |
|----------|-----|----------|-------|-------|
| `willow-remedies` | willow | npc | 4 | Herbalism — sap, species variety, drought survival, weeping-willow |
| `thorn-trails` | thorn | npc | 4 | Wilderness — distant planting, species discovery, old growth, level gate |
| `ember-alchemy` | ember | npc | 4 | Rare recipes — resource gathering, old growth, cherry+flame-maple, synthesis |
| `seasonal-cycle` | elder-rowan | seasonal | 5 | Seasonal events — spring/summer/autumn/winter + full-year level gate |
| `ancient-grove` | sage | endgame | 4 | Endgame — 5x old growth, 10 species, all 8 spirits, level 20 |

### Schema Verification

- `ancient-grove` has `prerequisiteChainIds: ["sage-lore", "dying-forest"]` — both exist in the file
- All `npcId` values match entries in `config/game/npcs.json` (willow, thorn, ember, elder-rowan, sage)
- All `speciesId` references in objectives use species IDs present in `config/game/species.json`
- `npcDialogueId` values reference IDs consistent with existing NPC greeting conventions (`willow-greeting`, `thorn-greeting`, `ember-greeting`, `rowan-seasons`, `sage-worldtree-lore`, `sage-prestige`, `rowan-exploration`)

---

## Data Format Verification

`dialogueLoader.ts` loads from `config/game/dialogue-trees.json` via:
```typescript
import dialogueTreesConfig from "@/config/game/dialogue-trees.json" with { type: "json" };
const CONFIG_TREES: DialogueTree[] = dialogueTreesConfig as unknown as DialogueTree[];
```

Validation uses `validateDialogueTree()` which checks:
1. `entryNodeId` exists in `nodes`
2. Every `branch.targetNodeId` exists in `nodes`

`loadAndValidateDialogueTrees()` throws on any violation — no silent fallback.
The test `"all config dialogue trees pass graph validation"` confirmed all 11
trees (including the 8 new spirit trees) pass graph validation.

`questChainEngine.ts` reads from `game/quests/data/questChains.json` directly.
The engine's `startChain`, `advanceObjectives`, and `claimStepReward` functions
consume the schema as written.

---

## Test Results

**Directly relevant suites — all pass:**

```
PASS game/systems/dialogueLoader.test.ts    (17 tests)
PASS game/quests/questChainEngine.test.ts   (44 tests)
PASS game/systems/dialogueBranch.test.ts    (37 tests)
Total: 98 tests, 0 failures
```

**Full suite:** 2 pre-existing test suite failures unrelated to this work.
`game/config/difficulty.test.ts` and `game/systems/survival.test.ts` fail because
W1-A renamed difficulty keys (`explore` -> `seedling`, etc.) and those tests
reference the old IDs. These failures were introduced by W1-A and were absent
on the baseline commit.

---

## Notes

- The `unlock_species` dialogue effect type is defined in `DialogueEffectType` but
  not yet implemented in `dialogueEffects.ts` (that is FIX-15, W1-D scope).
  The spirit trees correctly include `unlock_species` effects — they will fire once
  FIX-15 is complete. No runtime error occurs from unrecognized effect types because
  `applyDialogueEffects()` only processes `start_quest` and `advance_quest`; other
  types are silently ignored (handled by store/UI layer per the function's docstring).
- `seasonal-cycle` uses `"category": "seasonal"` which is a new category value not
  present in the existing 10 chains (which use `"npc"`, `"main_story"`). The quest
  chain engine reads chains by ID and does not filter by category at the engine level,
  so this is safe. The UI layer may need to handle this category when it renders
  quest categories.
