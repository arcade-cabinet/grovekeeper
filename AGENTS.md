# AGENTS.md — Grovekeeper Multi-Agent Orchestration

> **Purpose:** Guide any AI agent (Claude Code, Cursor, Cline, Windsurf, or custom) to effectively contribute to Grovekeeper. This document defines agent roles, coordination protocols, and the project memory bank that survives between sessions.

---

## Memory Bank

Every agent's context resets between sessions. The Memory Bank is the **only persistent link** between work sessions. Agents MUST read all memory bank files at the start of EVERY task.

### Memory Bank Structure

```
memory-bank/
├── projectbrief.md      # Foundation — core requirements, goals, scope
├── productContext.md     # Why this exists, who it's for, UX goals
├── systemPatterns.md     # Architecture, patterns, component relationships
├── techContext.md        # Tech stack, setup, constraints, dependencies
├── activeContext.md      # Current focus, recent changes, next steps
├── progress.md           # What works, what's left, known issues
└── features/             # Deep dives on complex subsystems
    ├── tree-catalog.md   # Species data, growth mechanics
    ├── ecs-systems.md    # ECS architecture details
    └── mobile-ux.md      # Mobile-first patterns and constraints
```

### File Hierarchy

```
projectbrief.md ──┬──> productContext.md ──┐
                  ├──> systemPatterns.md ──┼──> activeContext.md ──> progress.md
                  └──> techContext.md ──────┘
```

Lower files build on higher files. `projectbrief.md` is the root of truth. `activeContext.md` and `progress.md` change most frequently.

### Core Files

1. **`projectbrief.md`** — Foundation document. Defines core requirements, scope, and success criteria. Created once, rarely changed. Source of truth for project direction.

2. **`productContext.md`** — Why Grovekeeper exists. Problems it solves. Target audience. UX goals. Mobile-first philosophy. Session design (3-15 min commute play).

3. **`systemPatterns.md`** — Architecture decisions. ECS vs Zustand split. BabylonJS scene management. Component conventions. How systems compose together.

4. **`techContext.md`** — Exact tech stack versions. Build tooling. Development setup. Known constraints. Dependency notes. What works, what's brittle.

5. **`activeContext.md`** — **Most important for returning agents.** Current work focus. Recent changes. Active decisions being made. Blockers. What the last session accomplished and what the next session should tackle.

6. **`progress.md`** — Implementation status tracker. What's built and working. What's partially done. What's not started. Known bugs. Spec compliance checklist.

### Memory Bank Protocols

**On Session Start (MANDATORY):**
1. Read ALL memory bank files, starting with `activeContext.md` and `progress.md`
2. Read `CLAUDE.md` for project conventions
3. Verify understanding against the codebase before making changes

**On Session End (MANDATORY):**
1. Update `activeContext.md` with what was accomplished, decisions made, and next steps
2. Update `progress.md` if implementation status changed
3. Update other files if new patterns, tech changes, or architectural decisions were made

**Trigger: "update memory bank":**
When explicitly asked, review EVERY memory bank file — even those that seem unchanged. Focus especially on `activeContext.md` and `progress.md`.

**When to Create New Memory Files:**
- Complex feature documentation → `memory-bank/features/`
- API or integration specs → `memory-bank/features/`
- Testing strategies for specific systems → `memory-bank/features/`
- Deployment procedures → `memory-bank/features/`

---

## Agent Roles

### Game Systems Architect

**Scope:** ECS systems, game loop, growth mechanics, season/weather, resource economy, progression/prestige.

**Key Files:**
- `src/game/ecs/` — World, components, archetypes
- `src/game/systems/` — Growth, movement, time, quests
- `src/game/stores/gameStore.ts` — Persistent state
- `src/game/constants/` — Species, tools, config
- `GROVEKEEPER_BUILD_PROMPT.md` sections: 9-19, 21-27

**Rules:**
- Systems are pure functions: `(world, dt, ...context) => void`
- Write tests BEFORE implementing system logic
- ECS for per-frame state, Zustand for persistent state
- All balance values in `constants/` — never hardcode in systems
- Growth formulas must account for: season multiplier, water bonus, difficulty multiplier, species traits

**Mobile Awareness:**
- deltaTime must be capped at 100ms to prevent death spirals on backgrounded mobile tabs
- Offline growth calculation needed when app resumes from background
- Auto-save on `document.visibilitychange`

### 3D Scene Engineer

**Scope:** BabylonJS rendering, procedural meshes, camera, lighting, shadows, performance.

**Key Files:**
- `src/game/scenes/GameScene.tsx` — Scene initialization + render loop
- `src/game/systems/time.ts` — Sky colors, seasonal visuals
- `GROVEKEEPER_BUILD_PROMPT.md` sections: 11-12, 16

**Rules:**
- All meshes built from BabylonJS primitives — no external model loading
- Tree meshes must be deterministic (seeded RNG from `species + col + row`)
- Use instance meshes for same-species same-stage trees (performance)
- Freeze world matrices on static geometry
- Shadow map: 512px on mobile, 1024px on desktop
- Max 50 draw calls total
- BabylonJS operates outside React render cycle — use refs, not state

**Mobile Awareness:**
- Reduce particle counts on mobile
- Simpler shadow maps on mobile
- Lower tessellation for distant trees
- Test at 375px viewport width

### UI/UX Developer

**Scope:** HUD, menus, dialogs, responsive layout, touch interactions, accessibility.

**Key Files:**
- `src/game/ui/` — All UI components
- `src/game/ui/GameUI.tsx` — Composite HUD + joystick + dialogs
- `src/components/ui/` — shadcn/ui primitives
- `GROVEKEEPER_BUILD_PROMPT.md` sections: 3-8, 13, 20

**Rules:**
- shadcn/ui for structural components (Dialog, Button, Card, Progress)
- Tailwind for responsive layout utilities
- Game-specific colors via inline styles from `COLORS` constants
- All touch targets >= 44x44px
- Joystick zone (bottom-left 200x200px) is sacred — nothing overlaps it
- Test every UI change at 375px width minimum
- Transitions: 150ms ease-out default, 600ms ease-in-out for growth animations
- Use `prefers-reduced-motion` media query for all animations

**Mobile Awareness:**
- This IS the mobile agent. Everything is mobile-first.
- Portrait orientation is the primary layout
- Desktop adaptations use `sm:`, `md:`, `lg:` Tailwind breakpoints
- Joystick hidden on desktop (>768px), show WASD hints instead
- Tool belt layout: bottom-right on mobile, right sidebar on desktop

### Testing & Quality Agent

**Scope:** Unit tests, integration tests, type checking, linting, performance audits.

**Key Files:**
- `src/game/**/*.test.ts(x)` — Test files
- `vitest.config.ts` — Test configuration
- `biome.json` — Lint/format rules
- `tsconfig.json` — Type checking config

**Rules:**
- TDD: write the test, watch it fail, implement, watch it pass
- Pure functions (grid math, RNG, systems) get unit tests
- Store actions get state transition tests
- UI components get render + interaction tests via @testing-library/react
- Coverage targets: 80%+ for logic, 60%+ overall
- Run `pnpm check` before any commit

**Test Pattern:**
```typescript
describe('systemName', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## Coordination Protocols

### Handoff Between Sessions

Every session must end by writing to `memory-bank/activeContext.md`:

```markdown
## Last Session (YYYY-MM-DD)
### Completed
- [What was built/fixed/changed]

### Decisions Made
- [Any architectural or design choices]

### Blockers / Open Questions
- [Anything that needs resolution]

### Next Steps
- [Priority-ordered list of what to do next]
```

### Parallel Work Boundaries

Agents can work in parallel on these independent domains:

| Domain | Files | Can Parallel With |
|--------|-------|-------------------|
| ECS Systems | `src/game/ecs/`, `src/game/systems/` | UI, Tests |
| UI Components | `src/game/ui/` | Systems, Tests |
| Store Logic | `src/game/stores/` | 3D Scene |
| 3D Scene | `src/game/scenes/` | Store, UI |
| Tests | `*.test.ts(x)` | Everything |
| Constants/Data | `src/game/constants/` | Nothing (shared dependency) |

**Conflict Zone:** `GameScene.tsx` is the integration point where ECS, 3D, UI, and store all meet. Only one agent should modify it at a time.

### Spec Compliance Tracking

The canonical spec is `GROVEKEEPER_BUILD_PROMPT.md`. Track compliance in `memory-bank/progress.md` using this format:

```markdown
## Spec Compliance
- [x] Section 1: Tech Stack — Configured
- [x] Section 9: Core Game Loop — Basic loop working
- [ ] Section 10: Grid System — Missing tile types (water, rock, path)
- [ ] Section 14: Tree Catalog — 6/8 base species, 0/3 prestige
```

---

## Build Order — Production Completion Path

Based on the current state (see `memory-bank/progress.md`), here is the prioritized path to production:

### Phase A: Foundation Alignment (Do First)

1. **Align growth system** with spec's 5-stage model (Seed/Sprout/Sapling/Mature/Old Growth)
2. **Implement resource economy** (Timber/Sap/Fruit/Acorns replacing simple coins)
3. **Add stamina system** (drain on actions, regen over time)
4. **Implement seeded RNG** for deterministic tree meshes
5. **Add grid math utilities** (`gridToWorld`, `worldToGrid`, `tilesInRadius`, etc.)

### Phase B: Content Completeness

6. **Align tree catalog** to spec's 8 species with proper yields, harvest cycles, specials
7. **Align tool system** to spec's 8 tools with stamina costs, unlock levels
8. **Add tile types** (water, rock, path) with proper generation algorithm
9. **Add species-specific tree meshes** (pine cones, willow strands, baobab bulge, etc.)

### Phase C: Progression & Retention

10. **Implement achievement system** (15 achievements from spec)
11. **Implement prestige system** (level 25+, resets with permanent bonuses)
12. **Align quest/challenge system** with spec's daily challenges
13. **Add grid expansion** on level up (16, 20, 24, 32)
14. **Implement proper XP formula** from spec

### Phase D: Polish & Ship

15. **Design tokens CSS** — spec's full color system as CSS custom properties
16. **Typography** — Fredoka + Nunito Google Fonts
17. **Toast notification system** with floating numbers
18. **Growth animations** — smooth scale interpolation between stages
19. **Weather events** (rain, drought, windstorm, fog, golden hour)
20. **PWA manifest + service worker** for offline play
21. **Save system** with offline growth calculation
22. **Performance audit** — draw calls, FPS, bundle size
23. **Accessibility** — ARIA labels, reduced motion, color-blind mode
24. **Tech debt cleanup** — remove Next.js shims, clean index.html

### Phase E: Native & Distribution

25. **Capacitor build** — iOS + Android
26. **App store assets** — screenshots, descriptions
27. **Analytics** — session tracking, funnel metrics

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase.tsx | `ToolBelt.tsx` |
| Hooks | useCamelCase.ts | `useGameLoop.ts` |
| Systems | camelCase.ts | `growthSystem.ts` |
| Tests | *.test.ts(x) | `growth.test.ts` |
| Stores | camelCaseStore.ts | `gameStore.ts` |
| Constants | camelCase.ts | `trees.ts` |
| CSS Modules | Component.module.css | `HUD.module.css` |

## Import Order (Biome-enforced)

1. React / framework (`react`, `react-dom`)
2. Third-party (`@babylonjs/*`, `zustand`, `nipplejs`, `miniplex`)
3. Internal absolute (`@/components/*`, `@/lib/*`)
4. Relative game imports (`../stores/*`, `../systems/*`)
5. Style imports

## Key Principle: Mobile-First Everything

This is not a web app that happens to work on mobile. This is a **mobile game** that happens to work on desktop. Every agent, every decision, every line of code should ask: *"Does this work on a phone in portrait mode during a commute?"*

- 3-15 minute sessions, not hour-long marathons
- One-handed play with thumb on joystick
- Forgiving touch targets, not pixel-precise clicking
- Instant resume from background, auto-save on exit
- Low battery drain (cap frame rate, minimize GPU work)
- Works offline after initial load
