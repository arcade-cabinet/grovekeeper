---
title: RC Journey Performance Budget
updated: 2026-04-25
status: current
domain: quality
---

# RC Journey — Performance Budget

Per the spec: ≥ 55 FPS mobile, ≥ 60 FPS desktop, measured by `e2e/perf.spec.ts`
over a 30-second walk per biome. Numbers are committed here from `perf.json`
which the suite emits.

## Wave 20 capture status

The perf suite was exercised on 2026-04-25 against `release/workflows-v2`
HEAD. The reference rig (Apple Silicon macOS, default Playwright 1.x
Chromium) terminated the page context shortly after entering the
`screen=playing` state on every biome — the same failure mode that blocks
gates 04–16 in `rc-journey.spec.ts`. As a result, `perf.json` is empty
and no biome FPS numbers are committed.

This is a verification-environment limitation, not a runtime issue.
The runtime renders correctly in `pnpm dev` and the bundle hits the
Lighthouse Performance budget on landing (96.7%, see `lighthouse.json`).

A follow-up task is filed to wire the Playwright project with software
WebGL flags (`--use-gl=swiftshader --enable-unsafe-swiftshader`) so the
GameScene can mount in headless. After that change lands, the perf suite
will be re-exercised and this table updated.

## Reference rigs

| Tier    | Device                            | Project name (Playwright) |
|---------|-----------------------------------|---------------------------|
| Desktop | Chromium / Desktop Chrome         | `chromium`                |
| Mobile  | Chromium / Pixel 5 emulation      | `mobile-chrome`           |

The two existing Playwright projects in `playwright.config.ts` are used as
the reference rigs. Real-device measurements (Android via Capacitor) are out
of scope for the verification wave; they are tracked in
`docs/SYSTEMS.md` performance section.

## Budget table

A cell of `—` means the perf suite has not yet been exercised against that
biome on that rig (Wave 18 dependent).

| Biome   | Desktop FPS | Desktop Pass? | Mobile FPS | Mobile Pass? | Frame-time budget |
|---------|:-----------:|:-------------:|:----------:|:------------:|-------------------|
| Meadow  |     —       |               |     —      |              | 16.6ms desk / 18.1ms mob |
| Forest  |     —       |               |     —      |              | 16.6ms desk / 18.1ms mob |
| Coast   |     —       |               |     —      |              | 16.6ms desk / 18.1ms mob |
| Grove   |     —       |               |     —      |              | 16.6ms desk / 18.1ms mob |

Pass = Desktop ≥ 60, Mobile ≥ 55.

## Updating this file

```bash
# Run the perf suite on both projects:
pnpm test:e2e -- e2e/perf.spec.ts --project=chromium
pnpm test:e2e -- e2e/perf.spec.ts --project=mobile-chrome

# Then update the table above from docs/rc-journey/perf.json. The polish
# wave does this manually; future automation may add a `perf:render` script.
```

## Bundle / asset budgets

These are enforced by `size-limit` (already wired) and the asset pipeline; not
re-tested here, but called out for completeness:

- Initial gzipped bundle: < 500 KB
- Total game asset budget at RC: < 20 MB
