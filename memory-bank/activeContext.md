# Active Context — Grovekeeper

> Updated 2026-04-29 — RC complete.

## What is happening right now

The RC redesign is **complete**. All 20 implementation waves are done. The
game is deployed at v1.5.0-alpha.1 on
`https://arcade-cabinet.github.io/grovekeeper/`.

## Current state

- All 7 spec success criteria PASS (see `docs/STATE.md`)
- 1163 vitest tests passing (node + browser projects)
- All 16 RC journey screenshot gates baselined and CI-gated
- Lighthouse Performance 99, Accessibility 93, Best Practices 100
- Deployed via GitHub Pages with Capacitor Android APK in CI

## What is next

Post-RC polish and v1.0.0 proper release:
- Remove alpha label when no remaining known issues
- Android APK needs `npx cap add android` and committed android/ dir
- Audio polish wave (provisional aliases → real SFX packs)
- Any P1 bugs found during ongoing playthroughs

## Things to keep in mind on every commit

- Pre-commit hook runs `pnpm check && pnpm tsc && pnpm test:run`.
- Mobile-first: test at 375px, touch targets ≥ 44px.
- Determinism: all randomness via `scopedRNG(scope, worldSeed, ...extra)`.
- Tuning numbers in `config/*.json`, not inline.
- Two-pipeline rendering rule: terrain → voxel.renderer, animated GLBs → ModelRenderer.
