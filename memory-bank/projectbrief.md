# Project Brief — Grovekeeper

## Core Identity

**Name:** Grovekeeper
**Tagline:** *"Every forest begins with a single seed."*
**Genre:** Cozy 2.5D isometric tree-planting simulation / idle tending game
**Platform:** Mobile-first PWA (portrait), desktop secondary
**Target Session:** 3-15 minutes (commute-friendly)

## Core Requirements

### Must Have (MVP)
1. **Isometric 3D scene** — BabylonJS diorama view of a tile grid
2. **Farmer character** — walks the grid via virtual joystick (mobile) / WASD (desktop)
3. **Planting flow** — select seed, select tile, plant tree
4. **Growth system** — trees progress through 5 stages over time
5. **Harvesting** — collect resources from mature trees
6. **Resource economy** — Timber, Sap, Fruit, Acorns
7. **Tool system** — 8 tools with stamina costs
8. **Season cycle** — Spring/Summer/Autumn/Winter affecting growth
9. **Progression** — XP, levels, unlock species and tools
10. **Persistence** — auto-save to localStorage, resume on return
11. **Mobile-first HUD** — joystick, tool belt, resource display, all touch-friendly

### Should Have (Polish)
- Achievement system (15 achievements)
- Daily challenges / quest system
- Prestige system (level 25+ reset with bonuses)
- Grid expansion (12→16→20→24→32)
- Weather events (rain, drought, storm)
- Species-specific tree meshes (willow strands, pine cones, etc.)
- Toast notifications with floating numbers
- Offline growth calculation
- PWA service worker for offline play

### Nice to Have (Future)
- Capacitor native builds (iOS/Android)
- Sound effects and ambient audio
- Cosmetic grove borders (prestige rewards)
- Social features (compare groves)

## Success Criteria

1. **Playable loop:** Plant → Grow → Harvest → Expand runs smoothly
2. **Mobile performance:** 55+ FPS on mid-range phones
3. **Session design:** Satisfying 5-minute play session
4. **Retention hooks:** Daily challenges + progression create "one more session" feeling
5. **Visual charm:** Cozy, warm, organic feel — not sterile or corporate

## Canonical Specification

The complete game design specification lives in `GROVEKEEPER_BUILD_PROMPT.md`. It contains 32 sections covering every system, visual, and technical detail. All implementation should reference this document.

## Scope Boundaries

- **No multiplayer** — this is a single-player experience
- **No microtransactions** — no real-money purchases
- **No server backend** — all data is local (localStorage)
- **No complex 3D models** — everything is procedural from BabylonJS primitives
- **No animation rigging** — farmer moves via position interpolation, not skeletal animation
