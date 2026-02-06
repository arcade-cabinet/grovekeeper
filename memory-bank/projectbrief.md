# Project Brief -- Grovekeeper

## Core Identity

**Name:** Grovekeeper
**Tagline:** *"Every forest begins with a single seed."*
**Genre:** Cozy 2.5D isometric tree-planting simulation / idle tending game
**Platform:** Mobile-first PWA (portrait), desktop secondary
**Target Session:** 3-15 minutes (commute-friendly)

## Core Requirements

### Must Have (MVP) -- ALL IMPLEMENTED

1. **Isometric 3D scene** -- BabylonJS diorama view of a tile grid
2. **Farmer character** -- walks the grid via virtual joystick (mobile) / WASD (desktop)
3. **Planting flow** -- select seed, select tile, plant tree
4. **Growth system** -- trees progress through 5 stages over time
5. **Harvesting** -- collect resources from mature trees
6. **Resource economy** -- Timber, Sap, Fruit, Acorns
7. **Tool system** -- 8 tools with stamina costs
8. **Season cycle** -- Spring/Summer/Autumn/Winter affecting growth
9. **Progression** -- XP, levels, unlock species and tools
10. **Persistence** -- auto-save to localStorage with ECS serialization, resume on return
11. **Mobile-first HUD** -- joystick, tool belt, resource display, all touch-friendly

### Should Have (Polish) -- ALL IMPLEMENTED

- Achievement system (15 achievements)
- Daily challenges / quest system
- Prestige system (level 25+ reset with bonuses, 5 cosmetic border themes)
- Grid expansion (12 to 16 to 20 to 24 to 32)
- Weather events (rain, drought, windstorm)
- Species-specific tree meshes via SPS Tree Generator (willow strands, pine cones, etc.)
- Toast notifications with floating resource particles
- Offline growth calculation
- PWA service worker for offline play
- CSS weather overlays (rain, drought, windstorm, cherry petals)
- Growth animations (lerp-based smooth scaling)
- Desktop adaptations (mini-map, keyboard badges, resource labels)
- Design tokens (all spec CSS custom properties)
- Typography (Fredoka headings, Nunito body)
- Code splitting (107 KB initial, ~500 KB total game load)

### Nice to Have (Future)

- Capacitor native builds (iOS/Android) -- configured but not yet built
- Sound effects and ambient audio
- Social features (compare groves)
- Additional prestige species beyond current 3
- Tutorial improvements

## Success Criteria -- ACHIEVED

1. **Playable loop:** Plant, Grow, Harvest, Expand runs smoothly -- DONE
2. **Mobile performance:** 55+ FPS on mid-range phones -- DONE (code-split, matrix freezing, template caching)
3. **Session design:** Satisfying 5-minute play session -- DONE (offline growth, quick harvest, auto-save)
4. **Retention hooks:** Quests + achievements + prestige create "one more session" feeling -- DONE
5. **Visual charm:** Cozy, warm, organic feel -- DONE (SPS trees, PBR materials, weather overlays, seasonal tints)
6. **Test coverage:** 410 tests across 21 files, all passing, TypeScript clean -- DONE

## Canonical Specification

The complete game design specification is archived in the `docs/` directory. It covers all 32 sections of the original design. All 32 sections have been implemented.

## Scope Boundaries

- **No multiplayer** -- this is a single-player experience
- **No microtransactions** -- no real-money purchases
- **No server backend** -- all data is local (localStorage)
- **No complex 3D models** -- everything is procedural via SPS Tree Generator and BabylonJS primitives
- **No animation rigging** -- farmer moves via position interpolation, not skeletal animation
