---
title: RC Journey Surface Rubric
updated: 2026-04-24
status: current
domain: quality
---

# RC Journey Surface Rubric

Each of the 16 surfaces from `e2e/rc-journey.spec.ts` is scored on four axes,
0–3 each, max 12. A surface ships at score ≥ 10/12. Below threshold, the task
batch keeps iterating on it.

## Axes

- **Tone (0–3):** Does it feel like one game? Is the colour, light, audio
  language consistent with the rest of the journey?
- **Diegesis (0–3):** Is the player taught by the world rather than UI? Does
  the surface explain itself with environmental cues, NPCs, or
  in-world signals rather than tutorial overlays?
- **Polish (0–3):** Animation, lighting, audio, transitions feel finished?
  No popping, no harsh cuts, no placeholder art, no debug overlays.
- **Performance (0–3):** Hits the FPS / frame-time budget for this surface
  on the reference device? See `perf.md`.

A score of 0 means broken/unacceptable; 1 = below bar; 2 = ships; 3 = exemplary.

## Score sheet

Agents working on a surface MUST fill in their row, then re-score it after any
change. See `AGENT-PROTOCOL.md` for the mandated protocol.

| #  | Surface                           | Tone | Diegesis | Polish | Perf | Total | Ships? | Notes |
|----|-----------------------------------|:----:|:--------:|:------:|:----:|:-----:|:------:|-------|
| 01 | Landing                           |      |          |        |      |       |        |       |
| 02 | MainMenu                          |      |          |        |      |       |        |       |
| 03 | NewGame                           |      |          |        |      |       |        |       |
| 04 | First spawn — unclaimed grove     |      |          |        |      |       |        |       |
| 05 | Spirit greets                     |      |          |        |      |       |        |       |
| 06 | Gather logs                       |      |          |        |      |       |        |       |
| 07 | Craft hearth                      |      |          |        |      |       |        |       |
| 08 | Place hearth                      |      |          |        |      |       |        |       |
| 09 | Light hearth — cinematic          |      |          |        |      |       |        |       |
| 10 | Fast-travel — first node          |      |          |        |      |       |        |       |
| 11 | Villagers arrive                  |      |          |        |      |       |        |       |
| 12 | Craft first weapon                |      |          |        |      |       |        |       |
| 13 | Grove threshold                   |      |          |        |      |       |        |       |
| 14 | Wilderness — first chunk          |      |          |        |      |       |        |       |
| 15 | First encounter                   |      |          |        |      |       |        |       |
| 16 | Second-grove discovery            |      |          |        |      |       |        |       |

## Aggregate gate

RC ships when:

1. Every row above has Total ≥ 10.
2. Every screenshot baseline in this directory has been visually reviewed
   by an agent who self-graded against this rubric.
3. `perf.md` shows all four biomes hitting their FPS budget on both
   desktop and mobile reference rigs.
