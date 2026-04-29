---
title: Grovekeeper — Agent Operating Protocols
updated: 2026-04-29
status: current
---

# AGENTS.md — Grovekeeper

Agent operating protocols. Read after CLAUDE.md.

## Session startup

On every session start:

1. Read `.agent-state/digest.md` — ~10-line current state summary
2. Read `.agent-state/cursor.md` — current task and what's next
3. Read `.agent-state/directive.md` — ordered work queue
4. If working on a PRQ: read the relevant PRQ file in `docs/plans/`

Do NOT read the entire `memory-bank/` tree — it is legacy and partially
stale. The `.agent-state/` files are canonical.

## Persistent state layout

```text
.agent-state/
├── directive.md          # ordered work queue; Status: ACTIVE/RELEASED
├── digest.md             # ~10-line state summary; auto-updated on commit
├── cursor.md             # "what's next"; auto-updated on commit
└── decisions.ndjson      # append-only decision log; queryable
```

## Directive (work queue)

`directive.md` is the source of truth for what to work on. The format:

```markdown
Status: ACTIVE

## Queue

- [ ] PRQ-01: task T1 — switch camera to first-person
- [ ] PRQ-01: task T2 — VoxelCreatureActor base class
...
- [x] Done tasks (checked off as completed)
```

Work items in order. Mark `[x]` when done. Never skip ahead of an
unchecked dependency.

## Autonomous operation

**Full autonomy is the default.** Do not ask for permission to proceed.
Do not stop to report progress. Errors and warnings are top priority —
fix root cause, never suppress.

- Continuous work: when a task finishes, start the next.
- One PR per topic. Commit freely; push when all planned tasks for the
  work-unit are done and local review has passed.
- Fix errors before moving on. `pnpm check && pnpm tsc && pnpm test:run`
  must be green before any commit.

## Code quality gates (per commit)

```bash
pnpm check      # biome lint + format
pnpm tsc        # typecheck
pnpm test:run   # vitest node project
```

All three must pass. CI also runs `pnpm test:browser` on PRs.

## Stubs and TODOs are bugs

- No `// TODO:` in committed code
- No `pass` bodies, no `it.todo`, no unimplemented stub methods
- No `as any` except in test files (with biome-ignore comment)
- `Math.random()` in game logic is a bug — use `scopedRNG`

## PRQ execution protocol

For each PRQ in the directive:

1. Read the PRQ file (`docs/plans/prq-0N-*.md`) fully.
2. Work task by task, in the order listed.
3. Each task is one atomic commit.
4. After each commit: dispatch background review agents
   (comprehensive-review:code-reviewer + security-scanning:security-auditor).
5. Fold review findings into the next forward commit — never amend.
6. When all tasks in the PRQ are done: run `pnpm test:all`, then
   open a PR.

## Rendering rule (voxel pivot)

**Single pipeline: everything through `@jolly-pixel/voxel.renderer`.**

Do NOT:
- Add `ModelRenderer` imports to production code
- Add GLB model paths to the asset manifest
- Use `CameraFollowBehavior` (removed)

DO:
- Use `VoxelCreatureActor` for all moving entities
- Use `translateLayer` for animation
- Use `Camera3DControls` in first-person mode

## Audio rule

Use the JP engine audio stack (`GlobalAudio`, `GlobalAudioManager`,
`AudioBackground`). **Never import Howler directly.**

## Crafting rule

**New gameplay features use the compound trait system**, not
`known_recipes`. Do not write new unlock logic to `known_recipes`.

## Test diagnostic surface

`window.__grove.state` exposes read-only diagnostics for E2E tests:
`playerPosition`, `hasCraftedNamedWeapon`, `groveCount`, `currentBiome`,
`inventoryJson`, `journalCount`.

`window.__grove.actions` (warp helpers) is for screenshot baselines only.
**Never use warp helpers in golden-path E2E tests.**

## Biome list (locked)

Three wilderness biomes + Grove. Do not add biomes without adding assets.
See `docs/post-rc.md` for what each deferred biome needs to ship.

## Decisions log

When making a non-obvious architectural decision, include in the commit
body:

```
Decision: <what was decided>
Why: <reason>
Resolves: <what question this closes>
```

The `update-cursor.mjs` hook extracts these into `decisions.ndjson`.
