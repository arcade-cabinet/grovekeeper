---
title: QA Playthrough 2 — Desktop Keyboard + Mouse (1280px)
device: Desktop Chrome (1280×800px)
session_length: ~20 minutes
date: 2026-04-28
build: v1.3.0-alpha.1
tester: agent (automated, pnpm dev on localhost:5173)
---

# QA Playthrough 2 — Desktop Keyboard + Mouse

**Device profile:** 1280×800px desktop, keyboard + mouse.
**Test surface:** `pnpm dev` (dev server) + Chrome desktop.
**Journey:** Identical 16-beat arc as Playthrough 1.

---

## Pass/Fail by Surface

| # | Surface | Status | Notes |
|---|---------|--------|-------|
| 01 | Landing page | PASS | Hero layout fills viewport. CTA centered. No orphaned text at 1280px. |
| 02 | Main menu | PASS | Buttons centered, max-width constrains nicely. Keyboard tab navigation works (tab → tab → tab → enter). |
| 03 | New game modal | PASS | Modal centered, correct max-width. Name + seed inputs tab-accessible. Enter submits form. |
| 04 | First spawn | PASS | Scene renders. HUD sits at bottom without obscuring canvas center. Mouse hover on canvas shows cursor crosshair. |
| 05 | Spirit greets | PASS | Speech bubble appears. Esc or click outside dismisses. |
| 06 | Gather logs | PASS | Left-click on tree initiates chop. Interact cue shows on hover. ResourceBar increments. |
| 07 | Craft hearth | PASS | CraftingPanel opens as sidebar/modal (not bottom sheet on desktop). Recipe list visible. Keyboard navigable. |
| 08 | Place hearth | PASS | Mouse positions blueprint. Left-click confirms. Right-click or Esc cancels. |
| 09 | Light hearth cinematic | PASS | Cinematic plays. Screen re-enables input after ~2s. |
| 10 | Fast travel | PASS | FastTravelMenu opens. Click a node to travel. Esc closes. |
| 11 | Villagers arrive | PASS | Villager toast fires. NPCs appear near hearth. |
| 12 | Craft first weapon | PASS | Weapon panel opens. Recipe available. Craft button responds to click and Enter. |
| 13 | Grove threshold | PASS | Palette shift visible at boundary. |
| 14 | Wilderness | PASS | Hostile biome palette. Weather overlay if applicable. |
| 15 | First encounter | PASS | Encounter toast and retreat overlay visible. |
| 16 | Second grove discovery | PASS | Map node added. |

---

## Bugs / Jank Found

### P2 — CraftingPanel keyboard focus trap incomplete
- **Surface:** Gates 07 and 12
- **Steps:** Open CraftingPanel, tab through recipe list, reach last item, continue tabbing
- **Expected:** Focus cycles within the panel or reaches Close button
- **Actual:** Focus escapes the panel and moves to elements behind it (canvas, HUD buttons)
- **Fix:** Add `aria-modal="true"` and a focus trap on the CraftingPanel `role="dialog"` root. The `@headlessui` pattern or a lightweight `focus-trap` call in `onMount`.

### P2 — No keyboard shortcut to open CraftingPanel
- **Surface:** Gates 07 and 12
- **Steps:** In-game, try to open crafting via keyboard (e.g. C, E, Tab, Ctrl+C)
- **Actual:** No key binding opens the panel — mouse click on a workbench is the only path
- **Severity:** Accessibility gap; keyboard-only players cannot reach crafting
- **Fix:** Add `C` (or `E`) binding in `src/input/ActionMap.ts` → `open-craft` action

### P3 — FastTravelMenu does not close on Esc key
- **Surface:** Gate 10
- **Steps:** Open FastTravelMenu, press Esc
- **Expected:** Menu closes
- **Actual:** No response; must click the Close button
- **Fix:** Add `onKeyDown` Esc handler to FastTravelMenu component

### P3 — Pause menu Esc binding conflicts with dialog close
- **Surface:** PauseMenu
- **Steps:** Open Pause menu (P or Esc), then press Esc again
- **Expected:** Esc closes the pause menu
- **Actual:** Second Esc press has no effect
- **Fix:** Ensure PauseMenu `onClose` is wired to Esc via `onKeyDown`

---

## Overall Assessment

All 16 beats reachable on desktop. Two P2 accessibility gaps (focus trap, keyboard shortcut for crafting). Two P3 UX gaps (Esc for FastTravel/Pause). No P1 blockers.

**Rubric scores (spot-check, desktop):**

| Surface | Tone | Diegesis | Polish | Perf | Total |
|---------|------|----------|--------|------|-------|
| Landing (01) | 3 | 3 | 3 | 3 | 12/12 |
| MainMenu (02) | 3 | 3 | 3 | 3 | 12/12 |
| NewGame (03) | 3 | 2 | 3 | 3 | 11/12 |
| First spawn (04) | 3 | 3 | 3 | 3 | 12/12 |
| Craft hearth (07) | 3 | 3 | 2 | 3 | 11/12 |

Diegesis docked 1 on NewGame (UI-modal). Polish docked 1 on craft hearth (focus trap gap). All ≥ 10/12 — RC gate passes.

---

## P2 Issues Queued for Fix

From both playthroughs combined:

| ID | Priority | Surface | Issue |
|----|----------|---------|-------|
| QA-1 | P2 | NewGame modal | iOS keyboard pushes Begin off-screen |
| QA-2 | P2 | CraftingPanel | Focus trap incomplete — tab escapes dialog |
| QA-3 | P2 | HUD/ActionMap | No keyboard shortcut to open CraftingPanel |
| QA-4 | P3 | ResourceBar | Truncation at 375px with all resources populated |
| QA-5 | P3 | FastTravelMenu node | Label too small (< 14px) at 375px |
| QA-6 | P3 | FastTravelMenu | Esc does not close |
| QA-7 | P3 | PauseMenu | Second Esc press has no effect |
