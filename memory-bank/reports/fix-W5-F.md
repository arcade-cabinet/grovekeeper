# fix-W5-F: Tutorial Overlay Retirement — Quest-Driven Onboarding

## Summary

The 11-step overlay tutorial has been retired and replaced with organic quest-driven
onboarding via the `elder-awakening` starting quest chain.

---

## Starting Quest Chain: CREATED

No `elder-awakening` quest existed. It was added as the first entry in
`game/quests/data/questChains.json` with `"isStartingQuest": true`:

- **Step 1** `ea-talk-to-elder` — Talk to Elder Rowan (`talk_to_npc`, 1) → 25 XP
- **Step 2** `ea-plant-something` — Plant a tree (`trees_planted`, 1) → 25 XP
- **Step 3** `ea-find-labyrinth` — Discover a hedge labyrinth (`labyrinth_discovered`, 1) → 50 XP + compassActivated

The existing `rowan-history` chain at `requiredLevel: 1` covers the next natural
progression and is unchanged.

---

## How startNewGame() Is Wired

`game/stores/survivalState.ts` — `startNewGame(difficultyId)` now:
1. Calls `startChain(state.questChainState, "elder-awakening", state.currentDay)` from `questChainEngine`.
2. Writes the new chain state inside the existing `batch()` call.
3. Calls `queueMicrotask(() => showToast("Speak with the village elder near the well.", "info"))`.

---

## What tutorial.ts Does Now

`game/systems/tutorial.ts` is rewritten as a thin onboarding event bridge:

- `TutorialStep`, `TutorialState`, `TutorialStepDef` — kept as inert stub types for store/import compat.
- `TUTORIAL_STEPS` — empty array (no overlay steps).
- `initialTutorialState()` — returns `{ currentStep: "done", completed: true }` immediately.
- `tickTutorial()` — no-op, returns same state reference.
- `advanceStep()`, `skipTutorial()` — no-ops.
- `isTutorialComplete()` — always returns `true`.
- `ONBOARDING_SIGNAL_MAP` (new) — maps action signals to quest objective event types:
  - `"action:plant"` → `"trees_planted"`
  - `"action:harvest"` → `"trees_harvested"`
  - `"action:water"` → `"trees_watered"`

`game/stores/settings.ts` — `advanceTutorial(signal)` now reads `ONBOARDING_SIGNAL_MAP`
and calls `advanceQuestObjective(objectiveType, 1)` when the signal matches. The three
`advanceTutorial(...)` call sites in `actionDispatcher.ts` require no modification.

---

## Overlay UI Status: NULLED

`components/game/TutorialOverlay.tsx` — rewritten to `return null`. The component
renders nothing. The `TutorialTargetRect` type export is kept so `GameUI/types.ts`
imports continue to compile. `GameUI/index.tsx` requires no changes.

---

## GAME_SPEC.md Updated

Section 25 (`Tutorial System`) renamed to `Onboarding System`. Content replaced:
- §25.1 now documents the `elder-awakening` quest chain as the onboarding mechanism.
- Documents the `ONBOARDING_SIGNAL_MAP` signal forwarding.
- §25.2 (Progressive Hints) unchanged.

---

## Test Results

`pnpm test` — **3856 passed, 0 failed** (162 test suites).

Two tests in `game/systems/gameLoop.integration.test.ts` were updated:
- `"tutorial advances through all 11 steps in order via store actions"` →
  `"onboarding: tutorial state is immediately complete — overlay tutorial is retired"`
- `"tutorial step signal mismatch does not advance step"` →
  `"onboarding: advanceTutorial is a no-op on overlay state but forwards signals to quest engine"`

All tests in `game/systems/tutorial.test.ts` were rewritten to cover the new behaviour
(ONBOARDING_SIGNAL_MAP, no-op functions, empty TUTORIAL_STEPS, always-complete state).
