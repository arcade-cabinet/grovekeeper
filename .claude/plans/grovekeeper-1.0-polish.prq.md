---
title: Grovekeeper 1.0 — Macro→Meso→Micro Polish Plan
batch_id: grove-1.0-polish
priority: HIGH
status: active
updated: 2026-04-20
version_target: 1.0.0
---

# Grovekeeper 1.0 — Complete Game Polish PRQ

This is the full plan to take Grovekeeper from "ported + functional" (1.0.0-alpha.1, current PR #23) to "shippable 1.0 cozy mobile game." Organized macro (vision, scope) → meso (systems, pillars) → micro (atomic commits, single-file changes).

Each MICRO task is one atomic commit, auto-committed and pushed by the task-batch runner. Dependencies are expressed so the runner can parallelize where safe.

---

## MACRO — What "complete" means

### Definition of 1.0 done
A player picks up the game on a mobile browser or Android APK, plays a 5-minute session, and it feels **finished**:
- No jank (≥55 FPS mobile, no visible GC hitches, no texture pop-in after the initial load screen).
- Audible, responsive feedback on every interaction (plant, water, chop, harvest, level-up, quest complete, weather change, season turn).
- A visible sense of progress at every session: stamina never dead-ends progression, quest board always has something to do, the grove visually changes over 10+ minutes of play.
- Runs offline, survives tab-close + resume, PWA-installable.
- Zero `TODO`/`FIXME`/`stub`/dead code paths in the shipped `src/`.
- Zero `console.log` noise outside explicit debug flags.
- Lighthouse PWA score ≥90; accessibility ≥90; best-practices ≥90.
- CHANGELOG has a clean 1.0.0 entry with credits.

### Non-goals for 1.0
- Multiplayer or any networked features.
- In-app purchases or ads.
- More than the 15 species already catalogued.
- A custom shader pipeline — use Babylon PBR defaults throughout.
- Localisation beyond English (structured for later, no shipped translations).

### Pillars (design constraints, non-negotiable)
1. **Cozy never stressful.** Nothing punishes absence. No timers count down. No resources decay. Winter halts, never regresses.
2. **Mobile-first, one-handed.** 375px viewport minimum. 44×44 touch targets. Joystick + context button reachable by thumb.
3. **3–15 minute sessions.** Offline growth bridges gaps. No session is too short to feel like progress.
4. **Seeded determinism.** Every RNG call uses `scopedRNG(scope, worldSeed, ...)`. A given seed always produces the same world, same weather roll, same quest refresh.
5. **Config over code.** All tunables in `src/config/**/*.json`. Designers can tweak without touching TS.

---

## MESO — Workstreams

Each workstream is a group of related micro tasks. Workstreams run in priority order; within a workstream, tasks parallelize where dependencies allow.

| # | Workstream | Why it matters for 1.0 | Task range |
|---|---|---|---|
| W1 | **PR #23 review cleanup** | Unblock the in-flight merge. | T01–T12 |
| W2 | **Perf deferred-wins** | Hit the <16ms/frame mobile budget. | T20–T28 |
| W3 | **Audio polish** | Game currently feels silent. Every interaction needs SFX + light ambient music. | T30–T38 |
| W4 | **Game feel / juice** | Camera shake, particle bursts, tween easing, haptics. | T40–T47 |
| W5 | **Tutorial + onboarding** | First 90 seconds decide retention. | T50–T55 |
| W6 | **Quest + goal depth** | Quest system exists; needs enough content to feel like progression matters. | T60–T66 |
| W7 | **Narrative spine (spirits)** | 8 Grovekeeper spirits at hedge-maze centers → "Worldroot's Dream" endgame. | T70–T76 |
| W8 | **Accessibility** | Reduced-motion, colorblind palette, screen-reader labels on UI, keyboard nav. | T80–T85 |
| W9 | **Content pass** | Species descriptions, codex entries, achievement flavor text, NPC dialogue. | T90–T96 |
| W10 | **Build + release** | PWA icons, splash, Android APK CI, release-please v1.0.0. | T100–T106 |
| W11 | **Docs + CHANGELOG** | Ship-grade documentation. | T110–T115 |
| W12 | **QA + final polish** | Playthrough passes, bug fixes, final gate. | T120–T125 |

---

## MICRO — Atomic commits

### W1 — PR #23 review cleanup (blocking merge)

- **T01** [P1] Replace `Math.random()` in `src/engine/scene/NpcMeshManager.ts` with `scopedRNG("npc-mesh", worldSeed, npcId)`. deps=[] files=[NpcMeshManager.ts]
- **T02** [P2] Replace `as unknown as TreeSpeciesData[]` double-cast in `src/config/trees.ts:30` with a runtime shape validator; add 1 test case for malformed input. deps=[] files=[trees.ts, trees.test.ts]
- **T03** [P1] Add `src/ecs/solid.test.ts` covering useQuery/useQueryFirst/useTrait reactivity and cleanup. deps=[] files=[solid.test.ts]
- **T04** [P2] Update README.md to SolidJS + BabylonJS + Koota stack; remove React template language. deps=[] files=[README.md]
- **T05** [P2] Rewrite `docs/architecture/state-management.md` for Koota single-system traits. deps=[] files=[state-management.md]
- **T06** [P2] Rewrite `docs/architecture/ecs-patterns.md` for Koota (traits/queries/world). deps=[] files=[ecs-patterns.md]
- **T07** [P3] Update STANDARDS.md Key Files section to current paths. deps=[] files=[STANDARDS.md]
- **T08** [P1] Reconcile clsx/tailwind-merge: grep imports, remove if unused, else fix state-file claim. deps=[] files=[package.json]
- **T09** [P2] Add CHANGELOG `[1.0.0-alpha.1]` entry summarizing B1–B25 + T01–T08. deps=[T01..T08] files=[CHANGELOG.md]
- **T10** [P3] Bump `.release-please-manifest.json` to 1.0.0-alpha.1. deps=[T09] files=[release-please-manifest.json]
- **T11** [P2] Rewrite PR #23 body via `gh pr edit 23 --body-file`. deps=[T08,T09] files=[]
- **T12** [P1] Final gate on PR #23: lint+tsc+test+build; `gh pr ready 23`. deps=[T01..T11] files=[]

### W2 — Perf deferred-wins (from PERF_AUDIT.md Medium)

- **T20** [P1] Thin-instance ground grid tiles via `thinInstances` on a single plane; one draw call instead of 256. deps=[] files=[GroundBuilder.ts]
- **T21** [P1] Thin-instance border trees (decorative outside play grid); one draw per species. deps=[] files=[BorderTreeManager.ts]
- **T22** [P1] Thin-instance prop meshes (fences, stumps, mushrooms, flowers) where count >4. deps=[] files=[PropFactory.ts]
- **T23** [P2] Material atlas: consolidate 40+ StandardMaterial/PBRMaterial call sites into shared atlases keyed by (bark/leaf/ground) + UV offsets. deps=[T20,T21,T22] files=[materials.ts(new), multiple managers]
- **T24** [P1] Babylon chunk split: lazy-import `@babylonjs/loaders` + HDR skybox after scene mounts; use `manualChunks` in vite.config for Babylon splits. deps=[] files=[vite.config.ts, SkyManager.ts]
- **T25** [P2] Strip `pbrDebug` + unused OpenPBR shader chunks via rollup `define` flags. deps=[T24] files=[vite.config.ts]
- **T26** [P2] Fix per-template `new Vector3` churn in `spsTreeGenerator.ts` (reuse module-scope buffers). deps=[] files=[spsTreeGenerator.ts]
- **T27** [P2] Add `performance.mark`/`measure` around each game-loop system; console-log frame breakdown under `?perf=1`. deps=[] files=[GameScene.tsx, devDebug.ts(new)]
- **T28** [P1] Lighthouse audit + before/after bundle table update in PERF_AUDIT.md. deps=[T20..T27] files=[PERF_AUDIT.md]

### W3 — Audio polish

- **T30** [P1] Add SFX for plant (soft dig thud), water (droplet patter), chop (axe impact + leaf rustle), harvest (chime + satisfying thunk). deps=[] files=[AudioManager.ts, config/audio.json(new)]
- **T31** [P2] Level-up fanfare (major triad arpeggio, 400ms). deps=[T30] files=[AudioManager.ts]
- **T32** [P2] Achievement unlock sfx (bright bell + sparkle). deps=[T30] files=[AudioManager.ts]
- **T33** [P2] Quest-complete sfx (pleasant resolution, distinct from level-up). deps=[T30] files=[AudioManager.ts]
- **T34** [P1] Ambient music loop per season (4 short generated loops via Tone.js: spring light strings, summer warm pads, autumn folk pluck, winter sparse bells). Crossfade on season change. deps=[T30] files=[AudioManager.ts]
- **T35** [P2] Weather audio: rain layer, wind layer, drought silence (crickets). Fade in/out with weather events. deps=[T34] files=[AudioManager.ts]
- **T36** [P1] Mute toggle in PauseMenu persists to Koota Settings trait. Respect `prefers-reduced-motion` equivalent user preference. deps=[T30] files=[PauseMenu.tsx, traits.ts, actions.ts]
- **T37** [P2] Master volume slider in PauseMenu, 0–100 step 5, wired to Tone.Destination.volume. deps=[T36] files=[PauseMenu.tsx]
- **T38** [P3] Audio test harness: browser-mode test asserting Tone node graph connects for each SFX trigger. deps=[T30] files=[AudioManager.browser.test.ts(new)]

### W4 — Game feel / juice

- **T40** [P1] Camera micro-shake on chop harvest (50ms, 0.05 amplitude). deps=[] files=[CameraManager.ts, harvest.ts]
- **T41** [P1] Particle burst on plant (soil puff), water (droplets), chop (leaf confetti), harvest (coin sparkle). CSS/DOM-based not BabylonJS ParticleSystem (bundle-savings). deps=[] files=[FloatingParticles.tsx, FloatingParticlesContainer.tsx]
- **T42** [P2] Growth-stage transition: scale lerp + brief emissive pulse (150ms). deps=[] files=[TreeMeshManager.ts]
- **T43** [P2] Tree-harvest: felled animation (rotate + scale down over 400ms) before dispose. deps=[] files=[TreeMeshManager.ts, harvest.ts]
- **T44** [P2] Tool-swing tween: 180ms arc on tool belt item + color flash on active tool button. deps=[] files=[ToolBelt.tsx]
- **T45** [P1] Haptics via `@capacitor/haptics`: light impact on plant/water, medium on chop, heavy on level-up. Guard behind Capacitor runtime. deps=[] files=[platform.ts, actions.ts]
- **T46** [P3] Screen-edge glow on low stamina (pulse 1Hz, red-orange). deps=[] files=[GameUI.tsx, StaminaGauge.tsx]
- **T47** [P2] Coin/XP counter tick animation: numerals roll up over 400ms instead of snap. deps=[] files=[ResourceBar.tsx, XPBar.tsx]

### W5 — Tutorial + onboarding

- **T50** [P1] First-launch tutorial: 6-step guided sequence (welcome → plant seed → water → wait → harvest → unlock quest). State stored in `Tutorial` trait. deps=[] files=[Tutorial.tsx(new), traits.ts]
- **T51** [P1] Tool-tip layer: dim background, highlight one target UI element, arrow + text bubble. Reusable `<TutorialSpot>` component. deps=[T50] files=[TutorialSpot.tsx(new)]
- **T52** [P2] Tutorial skip button → Settings flag `tutorialComplete`. deps=[T50] files=[PauseMenu.tsx, traits.ts]
- **T53** [P2] First-harvest "nice catch" toast with species info. deps=[T50] files=[Toast.tsx, harvest.ts]
- **T54** [P3] Replay tutorial button in PauseMenu. deps=[T50] files=[PauseMenu.tsx]
- **T55** [P2] Empty-state hints: if stamina=0 show "Rest to recover" toast; if coins=0 and no seeds, show "Harvest to earn" toast. Rate-limited to once per session. deps=[] files=[GameUI.tsx, traits.ts]

### W6 — Quest + goal depth

- **T60** [P2] Ensure quest pool has ≥40 unique goal templates across all categories (plant/water/harvest/grow/species-specific/season-specific/weather-specific). deps=[] files=[config/quests.json, quests.ts]
- **T61** [P2] Quest-chain: 3 chains of 5 linked goals each (e.g. "Deciduous Master", "Winter Hardy", "Rain Harvester"). Completing a chain unlocks a cosmetic border. deps=[T60] files=[config/questChains.json, questChainEngine.ts]
- **T62** [P1] Quest panel daily refresh at real-world midnight; visible countdown. deps=[T60] files=[QuestPanel.tsx, quests.ts]
- **T63** [P2] Quest reward variety: XP, coins, seeds, rare seeds, tool upgrades, cosmetic borders. Balance table in `config/rewards.json`. deps=[T61] files=[config/rewards.json, quests.ts]
- **T64** [P3] Quest history log (last 20 completed) in PauseMenu. deps=[T60] files=[PauseMenu.tsx, traits.ts]
- **T65** [P3] Quest-completion particle burst + sfx (reuse T32). deps=[T33,T41] files=[quests.ts]
- **T66** [P2] Seasonal quest flavor: spring=planting-themed, summer=growth-themed, autumn=harvest-themed, winter=caretaking. deps=[T60] files=[config/quests.json, quests.ts]

### W7 — Narrative spine: Grovekeeper spirits

- **T70** [P2] Define 8 spirits in `config/spirits.json` (name, biome, dialogue, reward). deps=[] files=[config/spirits.json(new)]
- **T71** [P2] Hedge maze biome: procedurally generate a hedge-maze zone variant at player-level milestones (5, 10, 15, 20, 25, 30, 35, 40). deps=[T70] files=[WorldGenerator.ts]
- **T72** [P2] Spirit mesh: simple glow-orb + pulsing emissive + particle halo. One template per spirit archetype. deps=[T70] files=[SpiritMeshManager.ts(new), materials]
- **T73** [P1] Spirit dialogue UI: modal card with portrait, name, dialogue, reward-claim button. deps=[T70] files=[SpiritDialogue.tsx(new)]
- **T74** [P2] Spirits discovered → tracked in `SpiritsFound` trait. Completing all 8 triggers "Worldroot's Dream" epilogue cutscene (sky shift, credits, cosmetic unlock). deps=[T70,T71,T72,T73] files=[traits.ts, epilogue.tsx(new)]
- **T75** [P3] Codex page for found spirits; silhouette placeholder for undiscovered. deps=[T70,T74] files=[CodexPanel.tsx]
- **T76** [P2] Spirit-specific quest chain: each spirit grants 3 themed quests that unlock on first contact. deps=[T61,T70] files=[config/questChains.json]

### W8 — Accessibility

- **T80** [P1] `prefers-reduced-motion` media-query switches off camera shake, particle bursts, animation tweens. deps=[] files=[GameScene.tsx, CameraManager.ts, FloatingParticles.tsx]
- **T81** [P2] Colorblind-friendly palette toggle in Settings (protanopia/deuteranopia/tritanopia) — maps resource colors + weather colors. deps=[] files=[config/palette.json(new), PauseMenu.tsx]
- **T82** [P2] ARIA labels on all interactive UI (buttons, tool belt, quest items, action button). deps=[] files=[multiple ui/*.tsx]
- **T83** [P2] Keyboard nav: Tab cycles HUD focus order; Enter activates; Esc closes dialogs. deps=[] files=[useKeyboardInput.ts, GameUI.tsx]
- **T84** [P3] Text-size toggle (small/medium/large) applied via CSS custom property. deps=[] files=[config/ui.json, PauseMenu.tsx]
- **T85** [P3] Captions for audio-only cues: on-screen icon flash for weather/quest/achievement sfx when muted. deps=[T36] files=[Toast.tsx, GameUI.tsx]

### W9 — Content pass

- **T90** [P2] Flesh out 15 species entries in `config/trees.json` with flavor description + codex hint + preferred season. deps=[] files=[config/trees.json]
- **T91** [P2] 50+ achievement flavor texts (title + description + unlock hint). deps=[] files=[config/achievements.json]
- **T92** [P2] NPC dialogue pool: ≥20 lines per NPC type (merchant, forester, wanderer). deps=[] files=[config/npcs.json]
- **T93** [P3] Tool upgrade flavor text: each tier gets a name and description. deps=[] files=[config/tools.json]
- **T94** [P2] Codex: one page per species with all gameplay stats + lore snippet. deps=[T90] files=[CodexPanel.tsx, config/trees.json]
- **T95** [P3] Credits screen accessible from main menu + end of epilogue. deps=[] files=[Credits.tsx(new), MainMenu.tsx]
- **T96** [P3] Proper game-over state for prestige: "New Grove Begins" transition with farewell text. deps=[] files=[prestige.ts, GameUI.tsx]

### W10 — Build + release

- **T100** [P1] PWA manifest icons at 192, 512, maskable 512; splash screens for iOS (portrait only). deps=[] files=[public/manifest.json, public/icons/*]
- **T101** [P1] Service worker: precache strategy for game bundle + textures + HDR; runtime-cache for fonts. Handle update prompt. deps=[] files=[public/sw.js]
- **T102** [P2] iOS safe-area padding via `env(safe-area-inset-*)` on HUD top/bottom. deps=[] files=[global.css, HUD.tsx]
- **T103** [P2] Android APK debug build in CI: GitHub Actions `setup-java@v4` Temurin 21 + `setup-android@v3` + `./gradlew assembleDebug`; upload APK as PR artifact. deps=[] files=[.github/workflows/ci.yml]
- **T104** [P2] Release workflow: tag-driven via release-please; build production bundle + APK; attach to GitHub release. deps=[T103] files=[.github/workflows/release.yml]
- **T105** [P1] Deploy workflow: on merge to main, deploy to GitHub Pages. deps=[] files=[.github/workflows/cd.yml]
- **T106** [P1] Bump version to 1.0.0 in package.json + release-please manifest when all prior W-streams complete. deps=[W1..W9 done] files=[package.json, .release-please-manifest.json]

### W11 — Docs + CHANGELOG

- **T110** [P2] docs/GAME_DESIGN_DOCUMENT.md: one-stop design doc referencing all subdocs. deps=[] files=[docs/GAME_DESIGN_DOCUMENT.md]
- **T111** [P2] docs/TECHNICAL_ARCHITECTURE.md: Solid+Koota+Babylon rundown with data-flow diagram. deps=[] files=[docs/TECHNICAL_ARCHITECTURE.md]
- **T112** [P2] docs/SYSTEMS.md: table of every runtime system with inputs/outputs/frequency. deps=[] files=[docs/SYSTEMS.md]
- **T113** [P2] docs/API_REFERENCE.md: trait catalog + action bundle documentation. deps=[] files=[docs/API_REFERENCE.md]
- **T114** [P3] docs/ROADMAP.md: 1.0 → post-1.0 planned features (translations, more species, zone biomes). deps=[] files=[docs/ROADMAP.md]
- **T115** [P1] CHANGELOG 1.0.0 final entry with full feature list + credits. deps=[T106,W1..W10] files=[CHANGELOG.md]

### W12 — QA + final polish

- **T120** [P1] Full playthrough 1: mobile portrait 375px, 20-minute session, note every bug/jank/unclear UI. deps=[W1..W11] files=[docs/qa-playthrough-1.md(new)]
- **T121** [P1] Full playthrough 2: desktop keyboard+mouse, 20-minute session. deps=[T120] files=[docs/qa-playthrough-2.md(new)]
- **T122** [P1] Fix all P1/P2 bugs from T120+T121 (inline commits as discovered). deps=[T120,T121] files=[various]
- **T123** [P2] Lighthouse audit: PWA ≥90, Accessibility ≥90, Best Practices ≥90. Fix whatever blocks those scores. deps=[T122] files=[various]
- **T124** [P2] Bundle-size gate: initial JS ≤110 KB gz; total game load ≤550 KB gz. Add size-limit CI check. deps=[] files=[.github/workflows/ci.yml, .size-limit.json(new)]
- **T125** [P1] Final gate on main: tag v1.0.0, publish release, deploy, smoke-test live URL. deps=[T106,T122,T123,T124] files=[]

---

## Runner behavior

The task-batch runner consumes `.claude/state/task-batch/batch-grove-1.0-polish.json` and drives tasks in dependency order. Rules:

1. **Auto-commit + auto-push after every VERIFIED_DONE task.** One task = one commit.
2. **Gate command before marking VERIFIED_DONE**: `pnpm lint && pnpm tsc --noEmit && pnpm test:run`. On failure, retry up to 3 times with feedback; if still failing, mark FAILED and continue with siblings.
3. **Max iterations sentinel**: 200. If tripped, bug; investigate instead of looping.
4. **Compaction survival**: state file persists; PreCompact hook flushes.
5. **No voluntary stops on context pressure.** The runner trusts the compaction mechanism.
6. **Parallel agents** for tasks whose dependency sets are disjoint and whose file sets don't overlap. Each parallel agent commits independently; runner reconciles in queue.

## Stop conditions

- All 76 tasks VERIFIED_DONE → cut v1.0.0-rc.1, open release PR, exit 0.
- Any workstream's P1 tasks fail after 3 retries → pause, flag to user, do NOT skip.
- CI red on main → immediate-priority fix before next queued task.

## Parallelization windows

| Phase | Parallel candidates |
|---|---|
| W1 | T01, T02, T03, T04, T05, T06, T07, T08 all parallel |
| W2 | T20, T21, T22 parallel; T24/T25/T26 parallel after |
| W3 | T30 first; then T31–T35 parallel; T36/T37 sequential |
| W4 | T40, T41, T45 parallel; T42/T43 sequential on tree state |
| W5 | T50 first (trait); then T51/T52/T53/T54/T55 parallel |
| W6 | T60 first; T61/T63/T66 parallel |
| W7 | T70 first; T71/T72/T73 parallel; T74 last |
| W8 | T80/T81/T82/T83/T84/T85 all parallel |
| W9 | all parallel |
| W10 | T100/T101/T102 parallel; T103→T104 sequential; T105 independent |
| W11 | T110–T114 all parallel; T115 last |
| W12 | T120→T121→T122→T123 sequential; T124 parallel; T125 last |
