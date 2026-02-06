# System Patterns — Grovekeeper

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   React UI  │────▶│   Zustand    │────▶│  localStorage │
│  (HUD, Menu)│◀────│  (gameStore) │◀────│  (persistence)│
└──────┬──────┘     └──────────────┘     └───────────────┘
       │
       │ refs + callbacks
       ▼
┌──────────────┐     ┌──────────────┐
│  BabylonJS   │────▶│  Miniplex    │
│  (3D Scene)  │◀────│  (ECS World) │
└──────────────┘     └──────────────┘
       │
       │ runRenderLoop
       ▼
┌──────────────┐
│   Systems    │  (growth, movement, time, harvest, stamina)
│  (per-frame) │
└──────────────┘
```

## State Management Split

### ECS (Miniplex) — Runtime State
- Entity positions (farmer, trees)
- Growth progress per tree
- Tile states (empty, planted, blocked)
- Harvest cooldown timers
- Per-frame velocity

**Characteristic:** Changes every frame or every few seconds. Lives in memory. Serialized for saves.

### Zustand (gameStore) — Persistent State
- Player level, XP, coins
- Unlocked species and tools
- Selected tool and species
- Quest progress
- Settings (haptics, sound)
- Game time (microseconds)

**Characteristic:** Changes on player actions. Persisted to localStorage via `persist` middleware. Survives browser refresh.

### Rule of Thumb
If it changes every frame → ECS. If it persists across sessions → Zustand.

## ECS Entity Model

```typescript
interface Entity {
  id: string;
  position?: { x: number; y: number; z: number };
  renderable?: { meshId: string | null; visible: boolean; scale: number };
  tree?: { speciesId: string; growthProgress: number; health: number; wateredAt: number | null; plantedAt: number };
  player?: { coins: number; xp: number; level: number; currentTool: string; ... };
  gridCell?: { gridX: number; gridZ: number; type: string; occupied: boolean; treeEntityId: string | null };
}
```

### Queries (pre-defined, fast)
```typescript
treesQuery    = world.with('tree', 'position', 'renderable')
playerQuery   = world.with('player', 'position')
gridCellsQuery = world.with('gridCell', 'position')
```

### Entity Factories (archetypes.ts)
- `createTreeEntity(gridX, gridZ, speciesId)` → new tree at grid position
- `createPlayerEntity()` → farmer at grid center
- `createGridCellEntity(gridX, gridZ, type)` → tile

## BabylonJS Scene Pattern

The 3D scene is **imperative, not declarative**. React does NOT manage BabylonJS objects.

```
GameScene.tsx
├── useEffect[mount] → Initialize Engine, Scene, Camera, Lights, Ground
├── useEffect[mount] → Initialize ECS entities
├── engine.runRenderLoop → Game loop
│   ├── movementSystem(world, dt)
│   ├── growthSystem(dt)
│   ├── updateTime(dt) → sky, lighting, season
│   ├── Sync player mesh position from ECS
│   └── Sync tree meshes from ECS (create/update/delete)
├── Refs for all BabylonJS objects (meshes, materials, camera)
└── React overlay (GameUI) positioned absolutely over canvas
```

### Mesh Management
- Player mesh: single composite (body + head + hat), tracked in `playerMeshRef`
- Tree meshes: Map<entityId, Mesh> in `treeMeshesRef`, created lazily on first render
- Border trees: decorative, static, tracked in `borderTreeMeshesRef`

### Camera
- Locked `ArcRotateCamera` at isometric angles
- Alpha: -PI/4 (45deg), Beta: PI/3.5 (~51deg), Radius: 18
- All user inputs cleared — camera does not move

## Component Conventions

### UI Components
- Named exports only (no `export default`)
- Props typed with `interface Props`
- shadcn/ui for Dialog, Button, Card, Progress, etc.
- Tailwind for layout (`flex`, `grid`, responsive breakpoints)
- Inline styles for game-specific colors from `COLORS` constants
- Mobile-first sizing: `className="w-8 h-8 sm:w-9 sm:h-9"`

### Game Scene Components
- NOT React components — imperative BabylonJS code inside `useEffect`
- React refs for all mesh/material/light references
- Callbacks (`handleMove`, `handleAction`, `handlePlant`) bridge UI → ECS

## Input Flow

### Mobile (Primary)
```
nipplejs joystick
  → onMove(x, z) callback
  → Rotate to isometric axes (45deg)
  → movementRef.current = { x, z }
  → movementSystem reads ref each frame
  → Updates ECS entity position
  → Render loop syncs mesh position
```

### Desktop (Secondary)
```
Keyboard (WASD/arrows)
  → useKeyboard hook
  → Same movementRef path
```

### Tile Interaction
```
Tap/click on canvas
  → Raycast from touch point to ground plane
  → Snap to nearest grid cell
  → Context action based on: selectedTool + tileState
```

## Save/Load Pattern

### Current (Simple)
- Zustand `persist` middleware → `localStorage('grove-keeper-save')`
- Saves: level, XP, coins, unlocks, settings, time, quests
- Does NOT currently serialize ECS entities (trees, tiles)

### Target (Full)
- Zustand persist for player state
- Custom serializer for ECS entities (trees with positions, stages, species)
- Auto-save every 30s + on visibility change + on plant/harvest
- Offline growth calculation on resume: `timeSinceSave * growthRate`

## Season System

```
1 real second = 1 game minute (timeScale: 60)
24 real minutes = 1 game day
30 game days = 1 game month
3 months = 1 season
Full year = ~96 real minutes
```

Seasons affect:
- Growth multipliers (Spring: 1.5x, Summer: 1.0x, Autumn: 0.8x, Winter: 0.0x)
- Sky colors (time.ts → getSkyColors)
- Ground/canopy colors (time.ts → getSeasonalColors)
- Sun intensity and direction
- Quest availability (seasonal goals)

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Styling | Tailwind + shadcn/ui | Better DX than CSS Modules, consistent component library |
| 3D | Imperative BabylonJS | Declarative (Reactylon) too opaque for game loop control |
| State | ECS + Zustand split | Each tool for its strength |
| Testing | Vitest + happy-dom | Fast, Vite-native, React Testing Library compatible |
| Mobile | Capacitor bridge | PWA + native haptics/device APIs |
| Persistence | localStorage only | No backend, offline-first |
