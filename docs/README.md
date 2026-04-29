---
title: Grovekeeper Documentation
updated: 2026-04-24
status: current
domain: context
---

# Grovekeeper Documentation

> *"Every forest begins with a single seed."*

Grovekeeper is a third-person voxel tree-tending and town-building game.
Mobile-first PWA (portrait), desktop secondary. Target session: 3–15
minutes. The game is **mid-redesign** — the BabylonJS 2.5D build at
`https://arcade-cabinet.github.io/grovekeeper/` (1.0.0-alpha.1) is being
replaced per the RC redesign spec.

## Read these first

1. **[Spec — RC redesign source of truth](superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md)** — the
   full design, ordering, and verification protocol.
2. **[STATE](STATE.md)** — current build state, wave-by-wave.
3. **[DESIGN](DESIGN.md)** — what the game IS (the loop, NPC model,
   biomes, claim ritual).
4. **[ARCHITECTURE](ARCHITECTURE.md)** — how the game is built (Jolly
   Pixel layering, persistence stack, asset pipeline).
5. **[TESTING](TESTING.md)** — verification gates, screenshot list,
   rubric, performance budgets.
6. **[LORE](LORE.md)** — minimal world tone for content authors.
7. **[ROADMAP](ROADMAP.md)** — RC scope only.
8. **[post-rc](post-rc.md)** — explicitly cut, possible follow-on.

## Project root

- [`/CLAUDE.md`](../CLAUDE.md) — agent entry point, commands, project
  identity.
- [`/AGENTS.md`](../AGENTS.md) — extended operating protocols.
- [`/STANDARDS.md`](../STANDARDS.md) — code quality and brand rules.

## Generated

- [`asset-inventory.md`](asset-inventory.md) — emitted by
  `scripts/build-asset-manifest.mjs` once the asset pipeline wave runs.

## Verification artifacts (RC gates)

- `rc-journey/01-landing.png` … `rc-journey/16-second-grove-discovery.png`
- `rc-journey/REVIEW.md` — rubric scoring sheet.
- `rc-journey/perf.md` — runtime FPS measurement per biome.

## Legacy docs

The subdirectories `architecture/`, `game-design/`, `ui-ux/`, `brand/`,
`guides/`, `plans/`, and `screenshots/` contain documentation from the
pre-redesign BabylonJS build. They are **superseded** by the top-level
`DESIGN.md` and `ARCHITECTURE.md`. They will be pruned or rewritten as
the relevant waves run; trust the top-level docs as the current source of
truth.

## Development commands

```bash
pnpm dev                  # dev server
pnpm build                # production build
pnpm test                 # vitest, node project (default)
pnpm test:browser         # vitest, browser project (Playwright)
pnpm test:rc-journey      # RC journey screenshot suite (16 gates)
pnpm tsc                  # typecheck
pnpm check                # biome lint + format
```

See `/CLAUDE.md` for the full command list.
