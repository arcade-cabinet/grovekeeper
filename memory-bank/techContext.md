# Tech Context -- Grovekeeper

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Platform | Expo | SDK 55 | Universal: iOS + Android + Web |
| Runtime | React | 19 | UI layer |
| Native | React Native | 0.83 | Mobile runtime |
| 3D Engine | React Three Fiber | 9 | Declarative Three.js for React Native |
| 3D Helpers | @react-three/drei | 10 | Instanced meshes, sky, controls |
| ECS | Miniplex | 2.x | Entity-component-system |
| ECS + React | miniplex-react | latest | createReactAPI for reactive UI |
| State | Legend State | 3.x (beta) | Persistent state via expo-sqlite |
| Database | expo-sqlite | latest | Native SQLite for persistence |
| ORM | drizzle-orm | latest | Type-safe SQL queries |
| NPC AI | Yuka | 0.7.x | Lightweight game AI |
| NPC Animation | anime.js | latest | Lego-style rigid body part tweening |
| Audio | Tone.js | latest | Procedural synthesis, spatial audio, scheduling |
| Styling | NativeWind | 4.x | Tailwind CSS for React Native |
| Language | TypeScript | 5.9 | Strict mode |
| Lint/Fmt | Biome | 2.4 | Single tool for lint + format |
| Testing | Jest | latest | Unit + integration tests |
| E2E Testing | Maestro | latest | Mobile E2E tests |
| Package Mgr | pnpm | 9.x | Fast, strict |

### Key Technology Choices

- **Legend State 3.x** (NOT Zustand) for persistent state -- reactive observables with built-in expo-sqlite persistence
- **Tone.js** for ALL audio -- user mandate: never reduce quality for bundle size. ~150KB gzipped, worth it for FM synthesis, spatial API, iOS context handling, and scheduled ambient layers
- **anime.js** for NPC animation -- Lego-style rigid body part rotation (no skeletal rigs). Arms/legs rotate at joints, head turns, torso bobs. PSX-authentic animation style
- **3DPSX GLB models** as the visual foundation -- NOT procedural geometry for entities

### Removed/Not Used
- BabylonJS (replaced by R3F)
- Zustand (replaced by Legend State)
- Vite (replaced by Expo/Metro)
- Vitest (replaced by Jest)
- nipplejs (replaced by custom joystick)
- shadcn/ui + Radix (replaced by React Native Reusables)
- ESLint/Prettier (replaced by Biome)
- npm/yarn (pnpm only)

## Development Setup

```bash
# Prerequisites
node >= 20
pnpm >= 9

# Install + Run
pnpm install
pnpm dev              # Expo dev server
pnpm ios / android    # Platform-specific
pnpm web              # Web browser

# Quality
pnpm test             # Jest
pnpm test:coverage    # Coverage report
pnpm lint             # Biome lint + format check
pnpm format           # Biome format (write)
pnpm check            # Full check (lint + format, write fixes)
npx tsc --noEmit      # TypeScript type check
```

## Build Configuration

- **Expo SDK 55** with New Architecture required
- **Metro Bundler** (not Vite) with NativeWind CSS interop
- **TypeScript strict mode**, path alias `@/` maps to project root
- **Biome 2.4+** for lint + format (`ignoreUnknown: true`)

## Configuration

All game tuning constants in `config/game/*.json`:
```
config/game/
  species.json        # 15 tree species catalog
  tools.json          # Tool definitions + stamina costs + tiers
  resources.json      # 12 resource type definitions
  growth.json         # Growth stage parameters
  weather.json        # Event probabilities, multipliers
  achievements.json   # 45 achievements
  prestige.json       # NG+ tiers, bonuses, cosmetics
  grid.json           # Expansion tiers, costs
  npcs.json           # NPC template definitions
  dialogues.json      # Dialogue trees
  quests.json         # Quest chain definitions
  difficulty.json     # Difficulty tier multipliers
```

## Database

- **expo-sqlite + drizzle-orm** for persistence
- **Delta-only storage:** only store what the player changed (ChunkDelta)
- Same seed = same world regeneration. Unmodified chunks have zero storage cost.
- Save file budget: < 1 MB for 100 hours of play

## Asset Pipeline

- **3DPSX GLBs** are the primary visual assets (PSX-native models, 2-65 KB each)
- Asset library at `/Volumes/home/assets/3DPSX/` (1,240+ GLBs)
- PSX Mega Pack II (549 GLBs) for survival structures/props
- `useGLTF.preload()` for critical models
- Lazy load biome-specific models on chunk entry
- Composite GLBs need Blender split (Villager_NPCs_glb.glb, Buildings.glb)
- Audio assets at `/Volumes/home/assets/Audio/` (retro SFX, foley, music loops)

## Performance Budget

| Metric | Target |
|--------|--------|
| FPS mobile | >= 55 |
| FPS desktop | >= 60 |
| Draw calls | < 50 |
| Visible vertices | < 30K |
| Time to interactive | < 3s |
| Memory mobile | < 100 MB |
| Chunk generation | < 16ms |
| Labyrinth generation | < 100ms |

## Project Structure

```
grovekeeper/
  app/                    # Expo Router screens
  components/             # React Native + R3F components
    ui/                   # Base UI (button, text, icon)
    game/                 # Game UI (HUD, menus, dialogs)
    scene/                # R3F scene (Camera, Lighting, Sky, Ground)
    entities/             # R3F entities (Player, Trees, NPCs)
  config/                 # JSON game data files
  game/                   # Game logic (engine-agnostic)
    ecs/                  # Miniplex world, queries, archetypes
    systems/              # Pure game systems
    stores/               # Legend State persistent store
    hooks/                # Custom hooks
    ai/                   # Yuka NPC AI
    npcs/                 # NPC management
    quests/               # Quest system
    events/               # Event scheduler
    world/                # World generation, chunk loading
    structures/           # Structure placement + effects
    actions/              # Game action dispatcher
    config/               # Runtime config loaders
    constants/            # Codex + derived constants
    db/                   # expo-sqlite + drizzle-orm
    utils/                # Pure utilities (seedRNG, treeGeometry)
  assets/                 # Textures, models, fonts
  docs/                   # Game design + architecture docs
  .claude/                # Agent infrastructure (hooks, agents, commands)
  .maestro/               # Maestro E2E test flows
```

## Key Constraints

- **No Math.random()** -- all randomness via `scopedRNG(scope, worldSeed, ...extra)`
- **No inline constants** -- all tuning values in `config/game/*.json`
- **No files over 300 lines** -- decompose into subpackage with index.ts barrel
- **Named exports only** -- never `export default`
- **Systems are pure functions** -- `(world, deltaTime, ...context) => void`
- **PSX aesthetic enforced** -- no antialiasing, pixel ratio 1, flat shading, NearestFilter
