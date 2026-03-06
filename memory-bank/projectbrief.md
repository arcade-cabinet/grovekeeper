# Project Brief -- Grovekeeper

## Core Identity

**Name:** Grovekeeper
**Tagline:** *"Every forest begins with a single seed."*
**Genre:** Cozy 2.5D orthographic tree-planting simulation / idle tending game
**Platform:** Universal app (iOS + Android + Web) via Expo SDK 55
**Target Session:** 3-15 minutes (commute-friendly)

## Core Requirements

### Must Have (MVP) -- ALL IMPLEMENTED (BabylonJS era, being migrated)

1. **3D scene** -- Declarative R3F scene with orthographic diorama view of multi-zone world
2. **Farmer character** -- walks across zones via virtual joystick (mobile) / WASD (desktop)
3. **Planting flow** -- select seed, select tile, plant tree
4. **Growth system** -- trees progress through 5 stages over time
5. **Harvesting** -- collect resources from mature trees
6. **Resource economy** -- Timber, Sap, Fruit, Acorns
7. **Tool system** -- 8 tools with stamina costs
8. **Season cycle** -- Spring/Summer/Autumn/Winter affecting growth
9. **Progression** -- XP, levels, unlock species and tools
10. **Persistence** -- auto-save to expo-sqlite via drizzle-orm, resume on return
11. **Mobile-first HUD** -- joystick, tool belt, resource display, all touch-friendly
12. **Multi-zone world** -- player walks between zones, camera follows smoothly
13. **Procedural world generation** -- worlds generated from seed + player level
14. **Structure system** -- 6 structures with placement validation and effects

### Should Have (Polish) -- ALL IMPLEMENTED (BabylonJS era, being migrated)

- Achievement system (15 achievements)
- Daily challenges / quest system
- Prestige system (level 25+ reset with bonuses, 5 cosmetic border themes, fresh world generation)
- Grid expansion (12 to 16 to 20 to 24 to 32)
- Weather events (rain, drought, windstorm)
- Species-specific tree meshes (willow strands, pine cones, etc.)
- Toast notifications with floating resource particles
- Offline growth calculation
- Weather overlays (rain, drought, windstorm, cherry petals)
- Growth animations (lerp-based smooth scaling)
- Desktop adaptations (minimap, keyboard badges, resource labels)
- Design tokens
- Typography (Fredoka headings, Nunito body)

### Nice to Have (Future)

- Sound effects and ambient audio
- Social features (compare groves)
- Additional prestige species beyond current 3
- Additional zone types and biomes
- Structure upgrade tiers (basic -> enhanced -> advanced)
- Tutorial improvements

## Success Criteria -- ACHIEVED (BabylonJS era)

1. **Playable loop:** Plant, Grow, Harvest, Expand runs smoothly across zones -- DONE
2. **Mobile performance:** 55+ FPS on mid-range phones -- DONE
3. **Session design:** Satisfying 5-minute play session -- DONE
4. **Retention hooks:** Quests + achievements + prestige + zone exploration -- DONE
5. **Visual charm:** Cozy, warm, organic feel -- DONE
6. **Test coverage:** 1188 tests across 58 files -- DONE (being rebuilt with Jest)

## Migration Context

The original BabylonJS implementation is feature-complete and archived at `grovekeeper-babylonjs-archive/`. The project is being rebuilt on Expo/R3F using a clean room approach. Game design, ECS patterns, and Zustand state management carry over unchanged. The 3D rendering layer and platform integration are being replaced.

## Canonical Specification

The complete game design specification is archived in the `docs/` directory. It covers all 32 sections of the original design. All 32 sections were implemented in the BabylonJS version and are being migrated.

## Scope Boundaries

- **No multiplayer** -- this is a single-player experience
- **No microtransactions** -- no real-money purchases
- **No server backend** -- all data is local (expo-sqlite)
- **No complex 3D models** -- everything is procedural via R3F components
- **No animation rigging** -- farmer moves via position interpolation, not skeletal animation
