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

## Capture status — 2026-04-25 (post-warp rewrite)

The perf suite was rewritten alongside the rc-journey suite to use the
warp-based debug surface (`__grove.actions.teleportPlayer`) instead of
real keyboard input. With swiftshader flags now wired in
`playwright.config.ts` (commit `b202f78`) and the boot path no longer
blocking on a player-entity hydration that never completes in headless
WebGL, all four biome measurements now succeed.

Results below are the **rasterizer / rAF tick rate** under SwiftShader,
not full GPU-passthrough device FPS. SwiftShader runs the WebGL pipeline
on CPU; the headless build does not fully hydrate scene meshes (chunk
streamer requires a real GPU context to materialise the visible ring),
so what's captured is the runtime's frame budget *with the scene mostly
empty*. This is still a useful upper bound — it tells us the JS / koota
/ Solid render path is not pinning the main thread.

Real-device FPS (target ≥ 55 mobile, ≥ 60 desktop) is verified by hand
via `pnpm dev` on the reference rigs and tracked in `docs/SYSTEMS.md`.

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
| Meadow  |   115.3     |     yes       |     —      |              | 16.6ms desk / 18.1ms mob |
| Forest  |   114.8     |     yes       |     —      |              | 16.6ms desk / 18.1ms mob |
| Coast   |   114.8     |     yes       |     —      |              | 16.6ms desk / 18.1ms mob |
| Grove   |   114.7     |     yes       |     —      |              | 16.6ms desk / 18.1ms mob |

Pass = Desktop ≥ 60, Mobile ≥ 55. Numbers above are the SwiftShader rAF
clock rate (scene mostly empty, chunk streamer not hydrated). All four
biomes comfortably exceed the desktop 60 FPS gate; the JS/render path is
not the bottleneck. Mobile-chrome project not measured under this wave —
its swiftshader rasterizer is the same as desktop, the fairer mobile
number is real-device. See "Capture status" above.

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
