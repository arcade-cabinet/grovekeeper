# fix-W4-B: Dead Config Reconciliation + Tutorial Wiring

## Task A: Dead config files

### `config/game/dialogues.json`
- **Content:** 92 flat NPC dialogue nodes in legacy format using `id`/`choices[].next` fields (Elder Rowan, Hazel, Botanist Fern, Blossom, Bramble, Oakley, Sage, and more — full NPC conversation trees).
- **Live equivalent:** `game/npcs/data/dialogues.json` — exact same file content, imported by `game/npcs/NpcManager.ts` at line 8. The config copy was a stale duplicate.
- **Note:** `game/systems/dialogueLoader.ts` imports from `config/game/dialogue-trees.json` (a separate new-format file using the `DialogueTree` interface with `nodeId`/`branches[].targetNodeId`). The legacy flat format in `dialogues.json` is architecturally distinct from that.
- **Action:** Deleted. Not imported by any TS/TSX/JS source file.

### `config/game/quests.json`
- **Content:** 8 NPC quest chains: `rowan-history`, `hazel-trade`, `fern-collection`, `blossom-seeds`, `bramble-weather`, `oakley-crafting`, `sage-lore`, `dying-forest`.
- **Live equivalent:** `game/quests/data/questChains.json` — a strict superset. It contains the same 8 chains plus 5 additional chains added in a later session: `main-quest-spirits`, `worldroots-dream`, `willow-remedies`, `thorn-trails`, `ember-alchemy`, `seasonal-cycle`, `ancient-grove` (13 total). The 8 chains in `quests.json` are byte-for-byte identical to the corresponding entries in `questChains.json`.
- **Action:** Deleted. Not imported by any TS/TSX/JS source file.

### Import verification
`grep -r "dialogues.json\|quests.json" game/ components/ app/` — confirmed zero matches against `config/game/` paths for both files before deletion.

---

## Task B: Tutorial advancement wiring

### Files modified

**`game/actions/actionDispatcher.ts`** — three call sites added:

| Line (after edit) | Case | Signal dispatched |
|---|---|---|
| 182 | `CHOP` (axe + tree = harvest) | `"action:harvest"` |
| 189 | `WATER` (watering-can + tree) | `"action:water"` |
| 197 | `PLANT` (trowel + soil) | `"action:plant"` |

Pattern used: `if (success) store.advanceTutorial("action:<signal>");` — guards on `success` so the tutorial only advances when the underlying action actually completed.

Signal strings are taken verbatim from `game/systems/tutorial.ts` `TUTORIAL_STEPS` array:
- plant step: `signal: "action:plant"`
- water step: `signal: "action:water"`
- harvest step: `signal: "action:harvest"`

`advanceTutorial` is imported via `useGameStore.getState()` — `store` is already assigned at the top of `dispatchAction`. No new imports required.

**`game/actions/actionDispatcher.test.ts`** — changes:
- Added `mockAdvanceTutorial = jest.fn()` to the store mock
- Added `advanceTutorial: mockAdvanceTutorial` to the mock store state object
- Added describe block `"dispatchAction tutorial advancement (Spec §25.1)"` with 7 new tests covering:
  - CHOP success calls `advanceTutorial("action:harvest")`
  - CHOP failure does not call it
  - WATER success calls `advanceTutorial("action:water")`
  - WATER failure does not call it
  - PLANT success calls `advanceTutorial("action:plant")`
  - PLANT failure does not call it
  - BUILD (non-grove action) does not call `advanceTutorial` at all

---

## Test results

```
Test Suites: 161 passed, 161 total
Tests:       3845 passed, 3845 total
Time:        7.031 s
```

All 3845 tests pass. The 7 new tutorial wiring tests are all green.
