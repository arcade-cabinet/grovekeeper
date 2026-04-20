---
title: Code Quality & Project Standards
updated: 2026-04-20
status: current
---

# Standards

Non-negotiable code quality, testing, and development practices for Grovekeeper.

## Mobile-First Development

- **Baseline viewport:** 375px width (iPhone SE)
- **Touch targets:** Minimum 44×44px
- **Canvas:** `touch-action: none` on game canvas
- **Passive listeners:** All pointer/touch handlers use passive event listeners
- **Haptic feedback:** Integrate `@capacitor/haptics` for supported devices
- **Text readability:** Minimum 14px body text without zoom

## Code Quality

- **File size:** ≤300 LOC is a soft signal. Single-responsibility controllers up to 400 LOC are acceptable; 250 LOC doing three unrelated tasks is not.
- **Exports:** Named exports only. Never `export default`.
- **Stubs & TODOs:** None. Fix issues or delete code. No `pass` bodies.
- **Decomposition:** Keep files focused. Refactor into subpackages with `index.ts` barrel exports when a directory exceeds 300 LOC across multiple responsibilities.

## Testing Strategy

- **Unit tests:** Pure logic (math, RNG, state transitions)
- **Integration tests:** Real resources (Koota queries + trait mutations, world generation)
- **E2E tests:** Full game loops (tutorial → prestige reset)
- **Visual verification:** Screenshot-based verification of UI polish (not just "does it render")
- **Coverage target:** Unit + integration coverage ≥70%

Test files live adjacent to source: `*.test.ts(x)`.

```bash
pnpm test          # Watch mode
pnpm test:run      # CI mode (one-off)
pnpm test:coverage # Coverage report
```

## Performance Budgets

| Metric | Target | Status |
|--------|--------|--------|
| FPS (mobile) | ≥55 | Achieved |
| FPS (desktop) | ≥60 | Achieved |
| Initial bundle (gzip) | <500 KB | ~107 KB |
| Total game load (gzip) | <600 KB | ~500 KB |
| Time to interactive | <3s | Achieved |
| Memory (mobile) | <100 MB | Achieved |
| Draw calls | <50 | Achieved |

## Accessibility

- **Motion:** Respect `prefers-reduced-motion` in animations
- **Contrast:** WCAG AA minimum (4.5:1 for body text)
- **Keyboard:** All interactive elements focusable and keyboard-navigable on desktop
- **Touch:** No touch-sensitive elements smaller than 44px

## Git & Commits

- **Conventional Commits:** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`, `build:`
- **Squash-merge PRs:** One comprehensive commit per feature
- **Commit & push before destructive ops:** Use git as the safety net
- **Branch strategy:** Feature branches → pull requests → merge via GitHub

## Key Files

Before making changes, read (in order):
1. `CLAUDE.md` — project identity and tech stack
2. `AGENTS.md` — multi-agent protocols and memory bank
3. `docs/README.md` — documentation index
4. `src/main.tsx` — entry point and WorldProvider mount
5. `src/App.tsx` — root component
6. `src/Game.tsx` — screen router (menu | playing)
7. `src/engine/scenes/GameScene.tsx` — BabylonJS canvas + game loop orchestrator
8. `src/engine/scene/SceneManager.ts` — scene subsystems coordination
9. `src/koota.ts` — Koota world + spawn helpers
10. `src/traits.ts` — central trait catalog
11. `src/actions.ts` — action bundle
12. `src/ecs/solid.ts` — Solid↔Koota reactive hooks
13. `src/systems/growth.ts` — core game system (example)
14. `src/world-data/WorldManager.ts` — world data layer

## Type Safety & Linting

```bash
pnpm tsc       # TypeScript type check
pnpm lint      # Biome lint + format check
npx biome check . --write  # Auto-fix issues
```

All code must pass type checking and Biome linting before commit.
