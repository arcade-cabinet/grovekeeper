# Grove Keeper - Project Documentation

## Quick Start

```bash
pnpm install
pnpm dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |
| `pnpm tsc` | Type check |

## Project Structure

```
src/
├── game/
│   ├── constants/       # Game configuration
│   │   ├── config.ts    # Grid, colors, speeds
│   │   ├── trees.ts     # Tree species definitions
│   │   └── tools.ts     # Tool definitions
│   ├── ecs/             # Entity Component System
│   │   ├── world.ts     # Miniplex world & queries
│   │   └── archetypes.ts # Entity factories
│   ├── systems/         # Game logic systems
│   │   ├── growth.ts    # Tree growth mechanics
│   │   └── movement.ts  # Player movement
│   ├── stores/          # State management
│   │   └── gameStore.ts # Zustand store
│   ├── scenes/          # BabylonJS scenes
│   │   └── GameScene.tsx # Main 3D game view
│   ├── ui/              # React UI components
│   │   ├── MainMenu.tsx
│   │   ├── HUD.tsx
│   │   ├── Joystick.tsx
│   │   ├── SeedSelect.tsx
│   │   ├── ToolWheel.tsx
│   │   ├── PauseMenu.tsx
│   │   ├── Logo.tsx
│   │   └── FarmerMascot.tsx
│   └── Game.tsx         # Root game component
├── components/ui/       # shadcn/ui components
├── test/                # Test setup
└── App.tsx              # App entry
```

## Documentation

- [Game Design Document](./GAME_DESIGN_DOCUMENT.md) - Full game vision
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md) - System design
- [API Reference](./API_REFERENCE.md) - Code documentation
- [Roadmap](./ROADMAP.md) - Development phases
