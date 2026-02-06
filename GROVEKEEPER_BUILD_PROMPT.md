# 🌳 GROVEKEEPER — Complete Build Specification

> **This document is the single source of truth for building Grovekeeper from zero to shippable.**
> Hand this to any developer or AI agent. Everything needed is here.

---

## PROJECT IDENTITY

**Name:** Grovekeeper
**Tagline:** _"Every forest begins with a single seed."_
**Genre:** Cozy 2.5D isometric tree-planting simulation / idle tending game
**Platform:** Mobile-first PWA (portrait), desktop secondary
**Target Session:** 3–15 minutes (commute-friendly)

---

## TABLE OF CONTENTS

1. [Tech Stack & Tooling](#1-tech-stack--tooling)
2. [Project Structure](#2-project-structure)
3. [Brand & Visual Identity](#3-brand--visual-identity)
4. [Typography](#4-typography)
5. [Design Tokens (CSS Custom Properties)](#5-design-tokens)
6. [SVG Logo Specification](#6-svg-logo-specification)
7. [Farmer Mascot — "Fern"](#7-farmer-mascot--fern)
8. [Main Menu Design](#8-main-menu-design)
9. [Core Game Loop](#9-core-game-loop)
10. [Grid System](#10-grid-system)
11. [3D Scene & Camera — Diorama Rendering](#11-3d-scene--camera--diorama-rendering)
12. [Farmer Character](#12-farmer-character)
13. [Controls — Mobile Joystick & Desktop](#13-controls)
14. [Tree Catalog — All Species](#14-tree-catalog)
15. [Growth Stage System](#15-growth-stage-system)
16. [Procedural Tree Generation](#16-procedural-tree-generation)
17. [Tool System](#17-tool-system)
18. [Season & Weather System](#18-season--weather-system)
19. [Resource Economy](#19-resource-economy)
20. [HUD Design — Full Layout Spec](#20-hud-design)
21. [Progression & XP System](#21-progression--xp-system)
22. [Achievement System](#22-achievement-system)
23. [Daily Challenge System](#23-daily-challenge-system)
24. [Prestige System](#24-prestige-system)
25. [ECS Architecture (Miniplex)](#25-ecs-architecture)
26. [State Management (Zustand)](#26-state-management)
27. [Save System](#27-save-system)
28. [Performance Budgets](#28-performance-budgets)
29. [Testing Strategy (TDD)](#29-testing-strategy)
30. [Coding Standards](#30-coding-standards)
31. [Build Order — Phased Implementation](#31-build-order)
32. [File-by-File Manifest](#32-file-by-file-manifest)

---

## 1. TECH STACK & TOOLING

| Layer              | Technology                        | Version    | Why                                          |
| ------------------ | --------------------------------- | ---------- | -------------------------------------------- |
| **Runtime**        | React                             | 19.x       | UI layer, component model                    |
| **3D Engine**      | BabylonJS                         | 7.x        | Scene rendering, procedural textures, materials |
| **React↔Babylon**  | Reactylon                         | latest     | Declarative JSX scene graph for BabylonJS    |
| **ECS**            | Miniplex                          | 2.x        | Entity-component-system with React bindings  |
| **State**          | Zustand                           | 5.x        | Persistent game state, simple API            |
| **Input**          | nipple.js                         | 0.10.x     | Mobile virtual joystick                      |
| **Bundler**        | Vite                              | 6.x        | Fast dev server, HMR, optimized builds       |
| **Language**       | TypeScript                        | 5.7+       | Strict mode, path aliases                    |
| **Linter/Fmt**     | Biome                             | 2.3.x      | Single tool for lint + format, fast          |
| **Package Mgr**    | pnpm                              | 9.x        | Fast, strict, disk-efficient                 |
| **Testing**        | Vitest + @testing-library/react   | 3.x / 16.x | Vite-native, TDD, unit + integration        |
| **CSS**            | Vanilla CSS + CSS Modules         | —          | Scoped styles, zero runtime, no preprocessor |

### Key BabylonJS Imports

Only import what's used — tree-shake aggressively:

```
@babylonjs/core       — Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight,
                        ShadowGenerator, MeshBuilder, StandardMaterial, Color3, Color4,
                        Vector3, Mesh, GroundMesh
@babylonjs/materials  — GridMaterial (for tile grid), CellMaterial
@babylonjs/procedural-textures — GrassProceduralTexture, WoodProceduralTexture
@babylonjs/loaders    — (only if loading external assets later)
@babylonjs/gui        — (only if using BabylonJS GUI — prefer React HTML overlay)
```

### Package.json Dependencies

```json
{
  "dependencies": {
    "@babylonjs/core": "^7.37.0",
    "@babylonjs/materials": "^7.37.0",
    "@babylonjs/procedural-textures": "^7.37.0",
    "miniplex": "^2.0.0",
    "miniplex-react": "^2.0.0",
    "nipplejs": "^0.10.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "reactylon": "^0.5.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.3.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitest/coverage-v8": "^3.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

### Biome 2.3 Config

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedImports": "error", "noUnusedVariables": "error" },
      "style": { "useConst": "error", "useTemplate": "error" }
    }
  },
  "files": { "ignore": ["dist/**", "node_modules/**", "coverage/**"] }
}
```

### Vite Config

- `@vitejs/plugin-react` for JSX transform
- Path alias: `@/` → `./src/`
- Manual chunks: split `@babylonjs/*` and `react` into separate bundles
- `optimizeDeps.include` for BabylonJS, Reactylon, Miniplex, nipple.js
- `build.target: "es2022"`

### TypeScript Config

- `strict: true`, `jsx: "react-jsx"`, `target: "ES2022"`, `moduleResolution: "bundler"`
- Path alias: `"@/*": ["./src/*"]`

---

## 2. PROJECT STRUCTURE

```
grovekeeper/
├── docs/                              # Generated from this prompt's sections
│   ├── GAME_DESIGN_DOCUMENT.md
│   ├── BRAND_GUIDE.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── HUD_DESIGN.md
│   ├── TREE_CATALOG.md
│   ├── PROGRESSION_SYSTEM.md
│   ├── CONTROLS.md
│   └── AGENT_PLAYBOOK.md
├── public/
│   └── favicon.svg                    # Tree icon from logo mark
├── src/
│   ├── main.tsx                       # ReactDOM.createRoot entry
│   ├── App.tsx                        # Screen router: MainMenu | GameView
│   ├── styles/
│   │   ├── tokens.css                 # All CSS custom properties
│   │   └── global.css                 # Reset, base typography, utility classes
│   ├── components/
│   │   ├── MainMenu/
│   │   │   ├── MainMenu.tsx
│   │   │   ├── MainMenu.module.css
│   │   │   └── MainMenu.test.tsx
│   │   ├── HUD/
│   │   │   ├── HUD.tsx               # Composite: all HUD panels
│   │   │   ├── SeasonIndicator.tsx
│   │   │   ├── ResourceBar.tsx
│   │   │   ├── XPBar.tsx
│   │   │   ├── StaminaGauge.tsx
│   │   │   ├── ToolBelt.tsx
│   │   │   ├── ToastContainer.tsx
│   │   │   ├── ActionButton.tsx
│   │   │   ├── HUD.module.css
│   │   │   └── HUD.test.tsx
│   │   ├── GameScene/
│   │   │   ├── GameScene.tsx          # BabylonJS canvas + Reactylon scene
│   │   │   ├── IsometricCamera.tsx    # Fixed diorama camera rig
│   │   │   ├── SkyBox.tsx             # Procedural sky gradient
│   │   │   ├── Lighting.tsx           # Hemisphere + directional + shadows
│   │   │   ├── GroundPlane.tsx        # Grid-material ground
│   │   │   └── GameScene.test.tsx
│   │   ├── Farmer/
│   │   │   ├── FarmerMesh.tsx         # 3D farmer character mesh
│   │   │   ├── FarmerController.tsx   # Input → ECS velocity bridge
│   │   │   └── Farmer.test.tsx
│   │   ├── Grid/
│   │   │   ├── GroveGrid.tsx          # Renders all tiles from ECS
│   │   │   ├── Tile.tsx               # Individual tile mesh + decal
│   │   │   ├── TileHighlight.tsx      # Selection ring overlay
│   │   │   └── Grid.test.tsx
│   │   ├── Trees/
│   │   │   ├── TreeRenderer.tsx       # Maps ECS tree entities → meshes
│   │   │   ├── GrowthDecal.tsx        # Growth stage ground overlay
│   │   │   └── Trees.test.tsx
│   │   ├── Tools/
│   │   │   ├── ToolActions.ts         # Tool → action dispatch logic
│   │   │   └── Tools.test.tsx
│   │   └── Joystick/
│   │       ├── VirtualJoystick.tsx     # nipple.js wrapper
│   │       └── Joystick.test.tsx
│   ├── ecs/
│   │   ├── world.ts                   # Miniplex World<Entity> + queries
│   │   ├── components.ts             # All component type interfaces
│   │   └── systems/
│   │       ├── movementSystem.ts
│   │       ├── growthSystem.ts
│   │       ├── seasonSystem.ts
│   │       ├── harvestSystem.ts
│   │       └── staminaSystem.ts
│   ├── hooks/
│   │   ├── useGameLoop.ts            # rAF loop dispatching systems
│   │   ├── useJoystick.ts            # nipple.js → velocity hook
│   │   ├── useTileSelection.ts       # Raycast pick → tile select
│   │   ├── useKeyboard.ts            # WASD + hotkeys for desktop
│   │   └── useSaveLoad.ts            # Auto-save / load on mount
│   ├── stores/
│   │   ├── gameStore.ts              # Zustand: level, XP, inventory
│   │   ├── groveStore.ts             # Zustand: grid state (optional, or ECS-only)
│   │   └── uiStore.ts               # Zustand: screen, tool selection, toasts
│   ├── utils/
│   │   ├── constants.ts              # ALL balance values, species, tools, XP table
│   │   ├── gridMath.ts               # Grid↔world coordinate conversions
│   │   ├── seedRNG.ts                # Seeded PRNG (mulberry32)
│   │   └── treeGenerator.ts          # Procedural tree mesh builder
│   └── assets/
│       └── logo.svg                   # Grovekeeper logo (inline-ready)
├── tests/
│   ├── unit/
│   │   ├── gridMath.test.ts
│   │   ├── seedRNG.test.ts
│   │   ├── treeGenerator.test.ts
│   │   ├── growthSystem.test.ts
│   │   ├── seasonSystem.test.ts
│   │   ├── staminaSystem.test.ts
│   │   ├── harvestSystem.test.ts
│   │   └── gameStore.test.ts
│   └── integration/
│       ├── plantingFlow.test.tsx
│       └── seasonCycle.test.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── biome.json
├── package.json
└── README.md
```

---

## 3. BRAND & VISUAL IDENTITY

### Brand Essence

Grovekeeper is **cozy, grounded, and quietly magical**. The brand evokes tending a tiny world in a glass terrarium — warm light through leaves, rich soil, the slow satisfaction of watching something grow.

### Brand Pillars

- **Warmth** — Earth tones, rounded shapes, soft shadows
- **Growth** — Everything evolves; nothing stays static
- **Wonder** — Small magical moments hidden in the ordinary
- **Patience** — Good things take time (anti-hustle energy)

### Color System

**Primary Palette — "Forest Floor"**

| Name          | Hex       | Usage                       |
| ------------- | --------- | --------------------------- |
| Deep Canopy   | `#1A3A2A` | Dark backgrounds, body text |
| Grove Green   | `#2D6A4F` | Primary actions, headers    |
| Moss          | `#4A7C59` | Secondary elements          |
| Sage Mist     | `#7FB285` | Hover states, light accents |
| Morning Dew   | `#C8E6C9` | Light backgrounds, cards    |
| Parchment     | `#F5F0E3` | Page/panel backgrounds      |

**Earth Accents — "Rich Soil"**

| Name       | Hex       | Usage                      |
| ---------- | --------- | -------------------------- |
| Heartwood  | `#5C3D2E` | Tool icons, dark borders   |
| Bark Brown | `#8B6F47` | Secondary text, UI frames  |
| Warm Clay  | `#C49A6C` | Highlights, notifications  |
| Dry Straw  | `#D4C5A0` | Disabled states, track bg  |

**Seasonal Accents**

| Name         | Hex       | Season / Usage          |
| ------------ | --------- | ----------------------- |
| Spring Bloom | `#E8A0BF` | Spring UI accent        |
| Summer Gold  | `#E9C46A` | Summer, XP, rewards     |
| Autumn Ember | `#E76F51` | Autumn, warnings        |
| Winter Frost | `#A8DADC` | Winter, cooldown states |

**Functional Colors**

| Name    | Hex       | Usage                         |
| ------- | --------- | ----------------------------- |
| Success | `#52B788` | Planted, harvested, completed |
| Warning | `#F4A261` | Low stamina, drought          |
| Danger  | `#E76F51` | Tree dying, storm             |
| Info    | `#6AADCF` | Tips, almanac                 |

### UI Component Style

- **Panels**: `Parchment` bg, 2px `Bark Brown` border, `border-radius: 12px`, soft shadow
- **Primary Buttons**: `Grove Green` bg, `Parchment` text, Fredoka 600, 8px radius
- **Secondary Buttons**: transparent bg, `Grove Green` border + text
- **Icons**: Rounded line style, 2px stroke, 24px default
- **Transitions**: 150ms ease-out default; 600ms ease-in-out for growth animations
- **All corners rounded** — nothing sharp. Organic feel throughout.

---

## 4. TYPOGRAPHY

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet" />
```

| Role    | Font               | Weights   | Usage                              |
| ------- | ------------------ | --------- | ---------------------------------- |
| Display | **Fredoka**        | 400–700   | Logo, headings, HUD numbers, buttons |
| Body    | **Nunito**         | 400–700   | Body text, menus, tooltips, labels |
| Mono    | **JetBrains Mono** | 400       | Debug info, seed codes (dev only)  |

**Why Fredoka?** Rounded, warm, playful — like smooth river stones. Communicates "cozy game" without being childish. Available on Google Fonts with variable weight.

**Why Nunito?** Clean geometric sans with soft terminals. Highly readable at small mobile sizes. Pairs beautifully with Fredoka.

### Type Scale (Mobile-first)

```
--gk-text-xs:   0.75rem    /* 12px — labels, badges */
--gk-text-sm:   0.875rem   /* 14px — captions, tooltips */
--gk-text-base: 1rem       /* 16px — body text */
--gk-text-lg:   1.25rem    /* 20px — subheadings */
--gk-text-xl:   1.5rem     /* 24px — section headers */
--gk-text-2xl:  2rem       /* 32px — screen titles */
--gk-text-3xl:  2.75rem    /* 44px — logo lockup */
```

### Rules

- **Headings**: Fredoka 600, `Deep Canopy`, letter-spacing: -0.02em
- **Body**: Nunito 400, `Heartwood`, letter-spacing: 0
- **Buttons**: Fredoka 600, ALL CAPS for primary, Title Case for secondary
- **HUD Numbers**: Fredoka 700, `font-variant-numeric: tabular-nums`, `Summer Gold`

---

## 5. DESIGN TOKENS

All design values as CSS custom properties. Import in `global.css`.

```css
:root {
  /* Primary */
  --gk-deep-canopy: #1A3A2A;
  --gk-grove-green: #2D6A4F;
  --gk-moss: #4A7C59;
  --gk-sage-mist: #7FB285;
  --gk-morning-dew: #C8E6C9;
  --gk-parchment: #F5F0E3;

  /* Earth */
  --gk-heartwood: #5C3D2E;
  --gk-bark-brown: #8B6F47;
  --gk-warm-clay: #C49A6C;
  --gk-dry-straw: #D4C5A0;

  /* Seasonal */
  --gk-spring-bloom: #E8A0BF;
  --gk-summer-gold: #E9C46A;
  --gk-autumn-ember: #E76F51;
  --gk-winter-frost: #A8DADC;

  /* Functional */
  --gk-success: #52B788;
  --gk-warning: #F4A261;
  --gk-danger: #E76F51;
  --gk-info: #6AADCF;

  /* Typography */
  --gk-font-display: 'Fredoka', 'Nunito', sans-serif;
  --gk-font-body: 'Nunito', 'Segoe UI', sans-serif;
  --gk-font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --gk-space-1: 4px;
  --gk-space-2: 8px;
  --gk-space-3: 12px;
  --gk-space-4: 16px;
  --gk-space-5: 24px;
  --gk-space-6: 32px;
  --gk-space-7: 48px;
  --gk-space-8: 64px;

  /* Radii */
  --gk-radius-sm: 6px;
  --gk-radius-md: 12px;
  --gk-radius-lg: 20px;
  --gk-radius-full: 9999px;

  /* Shadows */
  --gk-shadow-sm: 0 2px 6px rgba(26, 58, 42, 0.1);
  --gk-shadow-md: 0 4px 12px rgba(26, 58, 42, 0.15);
  --gk-shadow-lg: 0 8px 24px rgba(26, 58, 42, 0.2);
  --gk-shadow-glow: 0 0 16px rgba(82, 183, 136, 0.3);

  /* Transitions */
  --gk-transition-fast: 150ms ease-out;
  --gk-transition-base: 250ms ease-out;
  --gk-transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
  --gk-transition-grow: 600ms ease-in-out;

  /* Z-Index Layers */
  --gk-z-ground: 0;
  --gk-z-decals: 10;
  --gk-z-entities: 20;
  --gk-z-effects: 30;
  --gk-z-hud: 100;
  --gk-z-modal: 200;
  --gk-z-toast: 300;
  --gk-z-joystick: 400;
}
```

---

## 6. SVG LOGO SPECIFICATION

The logo is a stylized tree growing within a rounded shield/badge shape with "GROVEKEEPER" wordmark below.

**Composition:**
- Outer badge: rounded hexagonal shield, `Deep Canopy` fill, `Bark Brown` 3px stroke
- Inner glow ring: 1.5px `Moss` stroke at 50% opacity, inset from outer
- Ground: two stacked ellipses at bottom of badge (`Heartwood` + `Bark Brown`) representing soil
- Trunk: tapered path from soil to canopy, `Heartwood` fill, with two subtle grain lines
- Canopy: 4 stacked ellipses in ascending lightness — `Grove Green` → `Moss` → `Success` → `Sage Mist` — offset slightly for organic feel
- Leaf highlight dots: 3-4 small circles of `Morning Dew` at varying opacity (0.4–0.7) scattered in canopy
- Roots: two small curved paths extending from trunk base, `Heartwood`, round linecap
- Sparkle accents: two small + shapes in `Summer Gold` at varying sizes/opacity near canopy edge (magical touch)

**Logo Mark (Icon Only):** The tree without the badge, centered in 1:1 square with 20% padding. Use for favicon and app icon.

**Color Variants:**
- Primary: as described above (dark badge, colored tree)
- Dark mode: `Sage Mist` tree on `Deep Canopy` badge
- Monochrome: single color silhouette

Generate this as an inline SVG component. ViewBox: `0 0 200 220`.

---

## 7. FARMER MASCOT — "FERN"

Fern is the player's avatar and the brand mascot — a small, adorable character.

### Character Design

- **Proportions:** Chibi / super-deformed (2.5 heads tall, ~80px SVG for menu)
- **Build:** Round, soft, approachable
- **Outfit:** Earth-brown overalls (`Heartwood`), forest-green shirt (`Moss`), straw hat (`Dry Straw` brim + `Summer Gold` dome + `Bark Brown` band)
- **Features:**
  - Round face, wheat/peach skin (#F5DEB3)
  - Dot eyes (`Deep Canopy`), small white eye-shine
  - Gentle upward-curving smile, `Heartwood` stroke
  - Rosy cheeks: circles of `Spring Bloom` at 40% opacity
  - Small trowel in one hand (gray blade + `Bark Brown` handle)
- **Hair Easter Egg:** A tiny green sprout (`Success` green) growing from the top of the hat — is Fern part plant?
- **Feet:** Simple rounded ellipses in `Heartwood`

### Menu Animation

In the main menu, Fern gently bounces up and down (translateY 0 → -6px → 0, 2s ease-in-out infinite).

### In-Game 3D Representation

The in-game farmer is a simple low-poly mesh:
- Capsule body (overalls color)
- Sphere head (skin color)
- Cone hat (straw color)
- No complex rigging — smooth position interpolation for movement
- Slight bob on Y axis while moving (0.05 units, synced to walk speed)

---

## 8. MAIN MENU DESIGN

### Layout (Mobile Portrait)

```
┌──────────────────────────────────────────┐
│                                          │
│            [Fern Mascot SVG]             │  ← bouncing gently
│                                          │
│            [Logo SVG Image]              │  ← breathing scale animation
│                                          │
│            G R O V E K E E P E R         │  ← Fredoka 700, Parchment
│       Every forest begins with           │  ← Nunito italic, Sage Mist
│              a single seed.              │
│                                          │
│          ┌──────────────────┐            │
│          │  🌱 New Grove     │            │  ← Primary button
│          └──────────────────┘            │
│          ┌──────────────────┐            │
│          │  🌲 Continue Grove│            │  ← Secondary (disabled if no save)
│          └──────────────────┘            │
│                                          │
│                               v0.1.0     │  ← JetBrains Mono, Moss 50%
└──────────────────────────────────────────┘
```

### Background

- Base: linear gradient 175°, `Deep Canopy` → `#0F2318` → `Deep Canopy`
- Radial glow: ellipse at 50% 80%, `Grove Green` at 15% opacity
- Floating particle dots: 6 radial-gradient dots in `Sage Mist`/`Morning Dew` at low opacity, drifting slowly via CSS animation (translateY -15px over 20s alternate)

### Interactions

- **New Grove**: resets game store, transitions to `playing` screen
- **Continue Grove**: only enabled if localStorage has save data, transitions to `playing`
- Check for save data on mount: `localStorage.getItem('grovekeeper-save')`
- Page transition: content fades out (300ms), then game scene fades in

---

## 9. CORE GAME LOOP

```
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  EXPLORE  │────▶│  PLANT   │────▶│  TEND    │────▶│  HARVEST │
  │  the grid │     │  seeds   │     │  & grow  │     │  rewards │
  └──────────┘     └──────────┘     └──────────┘     └─────┬────┘
       ▲                                                    │
       └────────────────────────────────────────────────────┘
                        EXPAND & UNLOCK
```

1. **EXPLORE:** Farmer walks the grid. Different terrain tiles create variety.
2. **PLANT:** Select seed from inventory → select Trowel tool → tap empty tile → planting animation → tree entity created.
3. **TEND:** Water sprouts/saplings with Watering Can. Prune mature trees with Shears. Protect from weather. Trees advance through 5 growth stages automatically over time.
4. **HARVEST:** Mature+ trees produce resources on cooldown timers. Walk to tree → tap Harvest action → resources added to inventory. Resources used to buy seeds, expand grid, upgrade tools.
5. **EXPAND & UNLOCK:** Level up → unlock new species, tools, grid expansions. Loop repeats with more variety and complexity.

### Session Flow

A typical 5-minute session:
1. Load save (auto) → grove appears where you left it
2. Check what grew while away (offline growth calculation)
3. Harvest any ready trees (quick taps)
4. Plant new seeds in empty tiles
5. Water any thirsty saplings
6. Check daily challenge progress
7. Auto-save on exit

---

## 10. GRID SYSTEM

| Property        | Value                              |
| --------------- | ---------------------------------- |
| Tile size       | 1×1 BabylonJS unit                 |
| Default grid    | 12×12 (expandable: 16, 20, 24, 32)|
| Tile states     | `empty`, `planted`, `blocked`, `water`, `path` |
| Rendering       | Ground plane with BabylonJS GridMaterial |
| Selection       | Green highlight ring (valid), red (blocked) |

### Tile Types

- **Empty:** Fertile soil, ready for planting. Default brown ground.
- **Planted:** Contains a tree entity. Shows growth-stage decal overlay.
- **Blocked:** Rocky ground. Must be cleared with Shovel before planting.
- **Water:** Small pond tiles. Cannot plant on. Boosts adjacent Willows.
- **Path:** Walkable but not plantable. Farmer moves faster on paths.

### Grid Generation

On "New Grove," generate the 12×12 grid:
- 70% empty (fertile)
- 15% blocked (rocks)
- 10% water (clustered in 1–3 ponds of 2–4 tiles)
- 5% path (connecting edges)
Use seeded RNG from a grove seed (random or player-chosen).

### Coordinate Math

```typescript
gridToWorld(col, row) → { x: col * tileSize, z: row * tileSize }
worldToGrid(x, z) → { col: round(x / tileSize), row: round(z / tileSize) }
isInBounds(pos, gridSize) → col >= 0 && col < gridSize && row >= 0 && row < gridSize
gridToIndex(col, row, gridSize) → row * gridSize + col
indexToGrid(index, gridSize) → { col: index % gridSize, row: floor(index / gridSize) }
tileCenterWorld(col, row) → { x: col + 0.5, z: row + 0.5 }
gridDistance(a, b) → |a.col - b.col| + |a.row - b.row| (Manhattan)
tilesInRadius(center, radius, gridSize) → GridPosition[] (Chebyshev distance)
```

---

## 11. 3D SCENE & CAMERA — DIORAMA RENDERING

### Camera Setup (Isometric Diorama)

Use BabylonJS `ArcRotateCamera` locked to isometric angles:

```
Camera type:    ArcRotateCamera
Target:         Center of grid (gridSize/2, 0, gridSize/2)
Alpha:          -Math.PI / 4       (45° horizontal rotation)
Beta:           Math.PI / 3.5      (~51° from vertical — slight top-down tilt)
Radius:         15–25 units        (adjustable via pinch zoom, clamped)
Lower radius:   10
Upper radius:   30
Lower beta:     Math.PI / 4
Upper beta:     Math.PI / 3
Panning:        Enabled (two-finger drag mobile, middle-mouse desktop)
Rotation:       DISABLED — locked isometric angle
```

This gives a "looking down and into a diorama" perspective. The world should feel like a tiny terrarium on a table.

### Ground Plane

- BabylonJS `MeshBuilder.CreateGround` with `width` and `height` = gridSize
- Material: `GridMaterial` from `@babylonjs/materials`
  - `majorUnitFrequency: 1` (line per tile)
  - `gridRatio: 1`
  - `mainColor`: Subtle earth brown `#8B6F47` at ~30% opacity
  - `lineColor`: Darker brown `#5C3D2E` at ~20% opacity
  - `backFaceCulling: false`
- Apply `GrassProceduralTexture` as diffuse on a base ground beneath the grid for fill

### Skybox

Use BabylonJS `CubeTexture` or a simple `CreateBox` with `BackgroundMaterial`:
- Top: soft sky blue `#87CEEB`
- Sides: gradient from sky to a warm horizon `#E9C46A` → tree-line green `#2D6A4F`
- Bottom: dark earth
- Alternatively: Use `Color4(0.53, 0.81, 0.92, 1)` as scene `clearColor` for simplest approach
- For polish: hemisphere gradient using shader material

### Lighting

```
1. HemisphericLight
   - direction: (0, 1, 0)
   - intensity: 0.7
   - diffuse: warm white (1, 0.98, 0.95)
   - groundColor: earth tint (0.4, 0.35, 0.3)

2. DirectionalLight (sun)
   - direction: (-1, -2, -1) normalized
   - intensity: 0.5
   - diffuse: warm gold (1, 0.95, 0.85)
   - Enable ShadowGenerator:
     - mapSize: 1024 (512 on mobile)
     - useBlurExponentialShadowMap: true
     - Add all tree root meshes as shadow casters
     - Ground receives shadows
```

### Post-Processing (Optional Polish)

- Subtle vignette at screen edges
- Slight bloom on `Summer Gold` and `Success` highlights
- Color grading toward warm earth tones

---

## 12. FARMER CHARACTER

### 3D Mesh (Simple Low-Poly)

Compose from BabylonJS primitives (no external model loading):

```
Head:     Sphere, diameter 0.35, color: #F5DEB3 (skin), position: y=1.1
Body:     Capsule or Cylinder, height 0.5, diameter 0.3, color: #5C3D2E (overalls), position: y=0.7
Shirt:    Thin cylinder peek, color: #4A7C59, at neck junction
Hat brim: Disc/cylinder, diameter 0.45, height 0.03, color: #D4C5A0, position: y=1.35
Hat dome: Hemisphere, radius 0.18, color: #E9C46A, position: y=1.35
Eyes:     Two tiny spheres, color: #1A3A2A, offset ±0.08 on X, z=0.15 forward
```

Group all under a single `TransformNode` parent for position/rotation.

### Movement

- Movement speed: 4 units/sec (2 when exhausted, stamina = 0)
- Y bob while moving: `Math.sin(time * 8) * 0.05`
- Face direction of movement (rotate Y to face velocity vector)
- Smooth rotation via lerp (not snap)

---

## 13. CONTROLS

### Mobile (Primary)

**Virtual Joystick (nipple.js):**

```typescript
nipplejs.create({
  zone: element,
  mode: 'static',
  position: { left: '80px', bottom: '80px' },
  size: 120,
  threshold: 0.1,
  fadeTime: 300,
  color: 'rgba(74, 124, 89, 0.4)',
  restOpacity: 0.5,
})
```

Position: bottom-left, 200×200px touch zone, z-index above HUD.

**Joystick → Isometric Conversion:**

```
On 'move' event:
  radians = data.angle.radian
  force = clamp(data.force, 0, 1)
  screenX = cos(radians) * force
  screenY = -sin(radians) * force
  // Convert screen direction to isometric world
  worldX = screenX - screenY
  worldZ = screenX + screenY
  // Normalize and set as farmer velocity
```

**Other Mobile Input:**
- Tap tile: raycast from touch → ground plane → snap to nearest tile center → select
- Tap action button: execute context action for selected tile + active tool
- Tap tool icon: switch active tool

### Desktop (Secondary)

| Key         | Action                           |
| ----------- | -------------------------------- |
| W / ↑       | Move up (iso NW)                 |
| S / ↓       | Move down (iso SE)               |
| A / ←       | Move left (iso SW)               |
| D / →       | Move right (iso NE)              |
| Click tile  | Select tile                      |
| Space/Enter | Execute context action           |
| 1–8         | Select tool by slot              |
| E           | Open seed selector               |
| Escape / P  | Pause                            |
| Scroll      | Zoom in/out                      |

**WASD → Isometric:**

```
inputX = (D pressed ? 1 : 0) - (A pressed ? 1 : 0)
inputY = (W pressed ? 1 : 0) - (S pressed ? 1 : 0)
worldX = inputX - inputY
worldZ = inputX + inputY
// Normalize if magnitude > 1
```

---

## 14. TREE CATALOG

8 species at launch + 3 prestige-only species.

### Species Data Table

| ID              | Name           | ★   | Unlock | Biome       | Yields               | Harvest | Evergreen | Special                               |
| --------------- | -------------- | --- | ------ | ----------- | -------------------- | ------- | --------- | ------------------------------------- |
| `white-oak`     | White Oak      | 1   | Lv.1   | Temperate   | Timber ×2            | 45s     | No        | Starter tree, reliable                |
| `weeping-willow`| Weeping Willow | 2   | Lv.2   | Wetland     | Sap ×3               | 60s     | No        | +30% yield near water tiles           |
| `elder-pine`    | Elder Pine     | 2   | Lv.3   | Mountain    | Timber ×2, Sap ×1    | 50s     | **Yes**   | Grows at 30% in Winter                |
| `cherry-blossom`| Cherry Blossom | 3   | Lv.5   | Temperate   | Fruit ×2             | 75s     | No        | Beauty Aura: +10% XP within 1 tile   |
| `ghost-birch`   | Ghost Birch    | 3   | Lv.6   | Tundra Edge | Sap ×2, Acorns ×1    | 55s     | No        | 50% growth in Winter; night glow      |
| `redwood`       | Redwood        | 4   | Lv.8   | Coastal     | Timber ×5            | 120s    | **Yes**   | Tallest; Old Growth: +1 Acorn/cycle   |
| `flame-maple`   | Flame Maple    | 4   | Lv.10  | Highland    | Fruit ×3             | 90s     | No        | Beauty Aura 2-tile; 2× in Autumn     |
| `baobab`        | Baobab         | 5   | Lv.12  | Savanna     | Timber+Sap+Fruit ×2  | 150s    | No        | Drought resist; all resources; 2-tile |

### Prestige Species

| ID              | Name           | Req.     | Special                           |
| --------------- | -------------- | -------- | --------------------------------- |
| `crystal-oak`   | Crystalline Oak| Prestige 1 | Acorns ×5; prismatic glow       |
| `moonwood-ash`  | Moonwood Ash   | Prestige 2 | Grows only at night; silver shimmer |
| `worldtree`     | Worldtree      | Prestige 3 | 2×2 tiles; boosts entire grove  |

### Seed Costs

- White Oak: **free** (infinite starter supply, 10 given at start)
- Others: cost resources matching their yield theme (e.g., Willow costs 5 Sap)
- Each seed entry in the `seeds` inventory is a `Record<speciesId, count>`

### Species Constants Structure

```typescript
interface TreeSpeciesData {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  unlockLevel: number;
  biome: string;
  baseGrowthTimes: [number, number, number, number, number]; // seconds per stage 0–4
  yield: { resource: ResourceType; amount: number }[];
  harvestCycleSec: number;
  seedCost: Record<string, number>;
  special: string;
  evergreen: boolean;
  meshParams: {
    trunkHeight: number;
    trunkRadius: number;
    canopyRadius: number;
    canopySegments: number;
    color: { trunk: string; canopy: string };
  };
}
```

---

## 15. GROWTH STAGE SYSTEM

Every tree entity has a `GrowthStage` component:

```typescript
interface GrowthStage {
  stage: 0 | 1 | 2 | 3 | 4;  // Seed → Sprout → Sapling → Mature → Old Growth
  progress: number;             // [0, 1) within current stage
  watered: boolean;
  totalGrowthTime: number;      // cumulative seconds
}
```

### Growth Formula

```
effectiveTime = baseTimeForStage × difficultyMultiplier / (seasonBonus × waterBonus)
progressPerTick = deltaTime × seasonBonus × waterBonus / (baseTimeForStage × difficultyMultiplier)
```

**Difficulty Multipliers:** ★1=1.0, ★2=1.3, ★3=1.6, ★4=2.0, ★5=2.5

**Season Multipliers:** Spring=1.5, Summer=1.0, Autumn=0.8, Winter=0.0
- Evergreen override: Winter=0.3
- Ghost Birch special: Winter=0.5

**Water Bonus:** Watered=1.3, Not watered=1.0, Drought=0.5

When `progress >= 1`: advance `stage` by 1, reset `progress` to 0, reset `watered` to false.

### Visual Per Stage

| Stage      | 3D Representation                              | Scale Factor |
| ---------- | ---------------------------------------------- | ------------ |
| 0 Seed     | No 3D mesh — decal on ground (dirt mound)      | 0.0          |
| 1 Sprout   | Single thin green cylinder (tiny shoot)         | 0.15         |
| 2 Sapling  | Small trunk + 1 canopy sphere                  | 0.4          |
| 3 Mature   | Full trunk + 2–3 canopy spheres                | 0.8          |
| 4 Old Growth | Thick trunk + 3 canopy spheres, 1.2× extra  | 1.2          |

Smooth scale interpolation between stages using `progress * 0.3` as partial preview.

---

## 16. PROCEDURAL TREE GENERATION

All tree meshes are generated from BabylonJS primitives. No external models.

### Trunk Builder

```
MeshBuilder.CreateCylinder({
  height: trunkHeight × stageScale,
  diameterBottom: trunkRadius × 2 × (1 + noise),   // noise: ±10% from seed
  diameterTop: trunkRadius × 1.2 × (1 + noise),
  tessellation: 8,
})
Material: StandardMaterial, diffuseColor from species.meshParams.color.trunk
```

### Canopy Builder

For each canopy sphere (1–3 depending on stage):

```
MeshBuilder.CreateSphere({
  diameter: canopyRadius × 2 × sizeVariation,  // sizeVariation: ±15% from seed
  segments: canopySegments,
})
Position: offset randomly from trunk top (±30% of canopyRadius on X/Z, ±15% on Y)
Material: StandardMaterial, diffuseColor from species.meshParams.color.canopy
```

### Species-Specific Variations

- **Elder Pine:** Use stacked cones (`CreateCylinder` with `diameterTop=0`) instead of spheres. 4 tiers with decreasing radius.
- **Weeping Willow:** Add 8–12 thin drooping cylinder "strands" hanging from canopy edge, curved downward.
- **Baobab:** Trunk uses sine-modulated radius for bulge effect. Flat wide canopy.
- **Ghost Birch:** Trunk is near-white. Add horizontal dark ring decals for bark marks. Canopy uses `Winter Frost` color.
- **Cherry Blossom:** Canopy uses `Spring Bloom` color. At stage 3+, add a simple particle emitter for falling petal effect (pink quads).

### Seeded RNG

Every tree mesh uses a seed derived from: `hashString(speciesId + "-" + col + "-" + row)`. This ensures the same tree at the same position always looks identical across saves.

Use mulberry32 PRNG:

```typescript
function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 17. TOOL SYSTEM

| ID                | Name           | Emoji | Unlock | Stamina | Action                              |
| ----------------- | -------------- | ----- | ------ | ------- | ----------------------------------- |
| `trowel`          | Trowel         | 🔨    | Lv.1   | 5       | Plant seed on empty tile            |
| `watering-can`    | Watering Can   | 🪣    | Lv.1   | 3       | Water sprout/sapling → growth boost |
| `almanac`         | Almanac        | 📖    | Lv.2   | 0       | View tree stats & species info      |
| `pruning-shears`  | Pruning Shears | ✂️    | Lv.3   | 4       | Prune mature tree → +yield bonus    |
| `seed-pouch`      | Seed Pouch     | 🌱    | Lv.4   | 0       | Open seed inventory (passive)       |
| `shovel`          | Shovel         | ⛏️    | Lv.5   | 8       | Clear blocked tiles, dig irrigation |
| `axe`             | Axe            | 🪓    | Lv.7   | 10      | Chop old growth for big timber, clear old trees |
| `compost-bin`     | Compost Bin    | ♻️    | Lv.10  | 6       | Convert waste → fertilizer (2× growth for 1 cycle) |

### Tool Action Flow

```
Player selects tool → walks to tile → taps action button
  → Validate: correct tool + tile state + enough stamina + (seed if planting)
  → Deduct stamina
  → Execute action (create entity / modify component / add resource)
  → Play feedback (toast notification, floating number, animation)
  → Award XP
```

### Context Action Label

The bottom-right action button shows a context-sensitive label:

| Active Tool  | Tile State      | Label       |
| ------------ | --------------- | ----------- |
| Trowel       | Empty           | "PLANT"     |
| Watering Can | Planted (0–2)   | "WATER"     |
| Shears       | Planted (3–4)   | "PRUNE"     |
| Axe          | Planted (4)     | "CHOP"      |
| Shovel       | Blocked         | "CLEAR"     |
| Any          | Planted (3+, ready) | "HARVEST" |
| Almanac      | Any planted     | "INSPECT"   |

---

## 18. SEASON & WEATHER SYSTEM

### Season Cycling

```
1 real second = 1 in-game "time unit"
60 seconds = 1 in-game day
4 days = 1 season
Full year cycle = 16 real minutes
```

Seasons cycle: Spring → Summer → Autumn → Winter → Spring...

### Season State

```typescript
interface SeasonState {
  current: 'spring' | 'summer' | 'autumn' | 'winter';
  seasonIndex: 0 | 1 | 2 | 3;
  day: number;         // 1–4
  dayProgress: number; // [0, 1)
  totalDaysElapsed: number;
}
```

### Season Effects

| Season | Growth Mult | Yield Effect          | Visual Effect                  |
| ------ | ----------- | --------------------- | ------------------------------ |
| Spring | 1.5×        | Normal                | Green tint, rain particles     |
| Summer | 1.0×        | Fruit trees 2× yield  | Golden light, possible drought |
| Autumn | 0.8×        | Timber 2× yield       | Canopy colors shift to orange  |
| Winter | 0.0× (*)    | Normal                | White ground tint, snow particles |

(*) Evergreen trees: 0.3× in winter. Ghost Birch: 0.5× in winter.

### Weather Events (Future Enhancement, Spec Now)

Random events within seasons:
- **Rain** (Spring/Autumn): Auto-waters all trees for 1 day
- **Drought** (Summer): Growth at 0.5×, un-watered trees can lose a growth stage
- **Windstorm** (Autumn): 10% chance to damage young (stage 0–1) trees
- **Morning Fog** (any): Cosmetic, +5% XP bonus
- **Golden Hour** (Summer/Autumn): +20% harvest yield for 1 day

---

## 19. RESOURCE ECONOMY

### Resources

| Type   | Icon | Earned From              | Spent On                           |
| ------ | ---- | ------------------------ | ---------------------------------- |
| Timber | 🪵   | Oaks, Pines, Redwoods    | Grid expansion, tool upgrades      |
| Sap    | 🫧   | Willows, Birches, Pines  | Buying seeds (water-loving species) |
| Fruit  | 🍎   | Cherries, Maples, Baobabs | Farmer stamina restore, seed cost  |
| Acorns | 🌰   | Ghost Birch, Old Growth   | Prestige currency, rare cosmetics  |

### Harvest Mechanics

- Trees at Mature (3) or Old Growth (4) produce resources on a cooldown timer
- When cooldown completes: `harvestable.ready = true`
- Player must walk to tree and tap Harvest
- Old Growth trees yield 1.5× the base amount
- Prestige bonus: `yieldMultiplier` applied globally

### Grid Expansion Costs

| Size  | Cost                        |
| ----- | --------------------------- |
| 16×16 | 100 Timber                  |
| 20×20 | 250 Timber + 50 Sap        |
| 24×24 | 500 Timber + 150 Sap       |
| 32×32 | 1000 Timber + 300 Sap + 50 Acorns |

---

## 20. HUD DESIGN

### Mobile Portrait Layout Map

```
┌──────────────────────────────────────────┐
│ ┌─Season──┐   ┌─XP Bar──┐  ┌─Resources─┐│
│ │🌱Spring  │   │Lv4 ████ │  │ 🪵42 🫧18 ││
│ │Day 3/4   │   │   64%   │  │ 🍎7  🌰3  ││
│ └─────────┘   └─────────┘  └──────────┘│
│                                          │
│                                          │
│              ╔══════════╗                │
│              ║  3D GAME ║                │
│              ║  WORLD   ║                │
│              ║          ║                │
│              ╚══════════╝                │
│                                     ┌──┐ │
│                            Stamina  │██│ │
│                                     │██│ │
│                            78/100   │░░│ │
│                                     └──┘ │
│                          ┌────────┐      │
│                          │ PLANT  │      │  ← Context action
│                          └────────┘      │
│  ┌──Joystick──┐         ┌──ToolBelt──┐  │
│  │            │         │ 🔨🪣✂️🪓  │  │
│  │    (●)     │         │ ⛏️🌱📖♻️  │  │
│  │            │         │ 🌱 Oak (×3)│  │
│  └────────────┘         └────────────┘  │
│                                    ⏸     │  ← Pause button
└──────────────────────────────────────────┘
```

### Panel Positions (CSS absolute)

| Panel              | Position                                         | Size         |
| ------------------ | ------------------------------------------------ | ------------ |
| Season Indicator   | `top: 12px; left: 12px`                          | 130×72px     |
| XP Bar             | `top: 12px; left: 50%; transform: translateX(-50%)` | 180×28px  |
| Resource Bar       | `top: 12px; right: 12px`                         | 150×64px     |
| Stamina Gauge      | `bottom: 180px; right: 16px`                     | 28×100px     |
| Action Button      | `bottom: 100px; right: 80px`                     | 72×48px min  |
| Tool Belt          | `bottom: 24px; right: 16px`                      | ~240×80px    |
| Joystick Zone      | `bottom: 0; left: 0`                             | 200×200px    |
| Pause Button       | `top: 12px; right: 170px`                        | 36×36px      |
| Toast Container    | `top: 52px; left: 50%`                           | auto         |

### All HUD panels use the "parchment panel" style:

```css
background: rgba(245, 240, 227, 0.90);
border: 2px solid var(--gk-bark-brown);
border-radius: 12px;
box-shadow: 0 4px 12px rgba(26, 58, 42, 0.15);
```

### Season Indicator Detail

Shows: season icon + name (Fredoka 600), day counter (Nunito), progress bar colored by season accent.

### Resource Bar Detail

2×2 grid of icon+number pairs. Fredoka 700, tabular-nums. Animate count changes with scale bounce.

### XP Bar Detail

Pill-shaped. Level badge (circle, Grove Green) on left. Gold fill bar. Percentage on right.

### Stamina Gauge Detail

Vertical bar filling bottom-to-top. Color gradient: Success (full) → Warning (50%) → Danger (25%). Pulse animation below 25%.

### Tool Belt Detail

Two rows of 4 tool buttons each (44×44px touch targets). Active tool gets `Summer Gold` ring + 1.08× scale. Locked tools are grayscale + 30% opacity. Below tools: active seed display when Trowel is selected.

### Toast Notifications

Slide in from top-center. Auto-dismiss after 2.5s. Stack max 3. Types with colors: success (green), warning (orange), info (blue), achievement (gold). Pill-shaped with Fredoka 600 text.

### Pause Menu Overlay

Full-screen `Deep Canopy` at 80% opacity. Centered parchment panel with stacked buttons: Resume, Settings, Almanac, Save & Quit.

### Desktop Adaptation (>768px)

- Joystick hidden (WASD)
- Tool belt moves to right sidebar (vertical)
- Resources show labels ("42 Timber")
- Keyboard shortcut badges on tools
- Mini-map in bottom-left

---

## 21. PROGRESSION & XP SYSTEM

### XP Formula

```
xpToNext(level) = 100 + (level - 2) × 50 + floor((level - 1) / 5) × 200
```

### XP Sources

| Action                    | Base XP | Bonus                        |
| ------------------------- | ------- | ---------------------------- |
| Plant a seed              | 10      | +5 per difficulty star       |
| Water a tree              | 3       |                              |
| Prune a tree              | 5       |                              |
| Harvest resources         | 8       |                              |
| Tree reaches Sapling      | 15      |                              |
| Tree reaches Mature       | 25      | +10 per difficulty star      |
| Tree reaches Old Growth   | 50      | +25 per difficulty star      |
| Clear a blocked tile      | 12      |                              |
| Complete daily challenge   | 100     |                              |
| Discover new species      | 30      | First plant of species only  |
| Fill a grid row/column    | 20      |                              |

### Level Unlocks (Key Milestones)

| Lv  | Unlock                                    |
| --- | ----------------------------------------- |
| 1   | White Oak, Trowel, Watering Can           |
| 2   | Weeping Willow, Almanac                   |
| 3   | Elder Pine, Pruning Shears                |
| 4   | Seed Pouch                                |
| 5   | Cherry Blossom, Shovel                    |
| 6   | Ghost Birch, Grid → 16×16                 |
| 7   | Axe                                       |
| 8   | Redwood, Irrigation                       |
| 10  | Flame Maple, Compost Bin                  |
| 12  | Baobab                                    |
| 15  | Grid → 24×24                              |
| 20  | Grid → 32×32                              |
| 25  | Prestige unlocked                         |
| 50  | Max level, all content                    |

---

## 22. ACHIEVEMENT SYSTEM

Achievements are tracked as an array of unlocked string IDs in the game store.

| ID                   | Name                | Trigger                                      |
| -------------------- | ------------------- | -------------------------------------------- |
| `first-seed`         | First Seed          | Plant 1 tree                                 |
| `seed-spreader`      | Seed Spreader       | Plant 50 trees (cumulative)                  |
| `forest-founder`     | Forest Founder      | Plant 200 trees                              |
| `one-of-each`        | One of Each         | Plant every base species at least once        |
| `patient-gardener`   | Patient Gardener    | Grow any tree to Mature                      |
| `old-growth-guardian`| Old Growth Guardian | Grow any tree to Old Growth                  |
| `timber-baron`       | Timber Baron        | Accumulate 1000 timber (lifetime)            |
| `sap-collector`      | Sap Collector       | Accumulate 500 sap                           |
| `the-giving-tree`    | The Giving Tree     | Harvest 500 fruit                            |
| `canopy-complete`    | Canopy Complete     | Fill an entire grid row with mature+ trees   |
| `full-grove`         | Full Grove          | Fill the 12×12 grid completely               |
| `biodiversity`       | Biodiversity        | 5+ species growing simultaneously            |
| `seasonal-veteran`   | Seasonal Veteran    | Experience all 4 seasons                     |
| `enchanted-grove`    | Enchanted Grove     | 5 Old Growth trees with overlapping auras    |
| `new-beginnings`     | New Beginnings      | Prestige for the first time                  |

Display: Gold-bordered modal centered on screen, sparkle effect, pauses game briefly. Toast for minor achievements, modal for major ones.

---

## 23. DAILY CHALLENGE SYSTEM

Rotating objectives drawn from a weighted pool. New challenge every 24 real hours (tracked via timestamp in save data).

**Challenge Templates:**
- "Plant N [species] trees" (Easy → 100 XP + 2 seeds)
- "Harvest N [resource]" (Easy → 100 XP + bonus resource)
- "Grow N trees to [stage]" (Medium → 200 XP + 3 seeds)
- "Survive [weather event]" (Medium → 200 XP + rare seed)
- "Fill a complete row" (Hard → 300 XP + 5 seeds)
- "Reach Old Growth with [species]" (Hard → 300 XP + legendary seed)

**Streak Bonuses:** 3 days → +50% XP day, 7 → rare seed pack, 14 → cosmetic, 30 → legendary seed.

---

## 24. PRESTIGE SYSTEM

At Level 25+, player can "Prestige":

**Resets:** Grid (back to 12×12 empty), level (to 1), tools (to base), inventory (to 0), seeds (to 10 White Oak).

**Permanent Bonuses:**

| Prestige | Bonus                                           |
| -------- | ----------------------------------------------- |
| 1        | +10% growth speed, unlock Crystalline Oak        |
| 2        | +15% yield multiplier, unlock Moonwood Ash       |
| 3        | +20% XP multiplier, unlock Worldtree             |
| 4        | +10% stamina regen                               |
| 5        | +25% all bonuses, "Ancient Grovekeeper" title    |

**Cosmetic Unlocks per Prestige:** Grove border themes — Stone Wall, Flower Hedge, Fairy Lights, Crystal Boundary, Ancient Runes.

---

## 25. ECS ARCHITECTURE (MINIPLEX)

### Entity Component Types

```typescript
interface Entity {
  // Spatial
  position?: { x: number; z: number };
  velocity?: { x: number; z: number };
  gridCell?: { col: number; row: number };

  // Tile
  tileState?: { type: 'empty' | 'planted' | 'blocked' | 'water' | 'path' };

  // Tree
  growthStage?: { stage: 0|1|2|3|4; progress: number; watered: boolean; totalGrowthTime: number };
  treeSpecies?: { speciesId: string; meshSeed: number };
  harvestable?: { resources: {type: string; amount: number}[]; cooldownElapsed: number; cooldownTotal: number; ready: boolean };
  aura?: { type: 'beauty'|'growth'|'shield'; radius: number; strength: number };

  // Farmer
  farmerState?: { stamina: number; maxStamina: number; activeTool: string; selectedSeed: string|null };

  // Tags
  isFarmer?: true;
  isSelected?: true;
  isTile?: true;
  isTree?: true;
}
```

### World & Queries

```typescript
const world = new World<Entity>();

const queries = {
  tiles:       world.with('isTile', 'gridCell', 'tileState'),
  trees:       world.with('isTree', 'gridCell', 'growthStage', 'treeSpecies'),
  harvestable: world.with('isTree', 'harvestable'),
  farmer:      world.with('isFarmer', 'position', 'farmerState'),
  selected:    world.with('isSelected'),
  auras:       world.with('isTree', 'aura', 'gridCell'),
};
```

### Systems (Pure Functions)

Each system is a pure function: `(world, deltaTime, ...context) → void`

1. **movementSystem(world, dt, gridSize):** Apply velocity to farmer position. Clamp to grid bounds. Speed = 4 or 2 based on stamina.
2. **growthSystem(world, dt, season):** For each tree, calculate effective growth rate and advance progress. Handle stage transitions.
3. **seasonSystem(seasonState, dt) → boolean:** Advance day/season clock. Return true if season changed.
4. **harvestSystem(world, dt):** Advance harvest cooldowns. Mark `ready=true` when cooldown completes.
5. **staminaSystem(world, dt):** Regenerate stamina at 2/sec up to max.

### Game Loop (useGameLoop hook)

```
requestAnimationFrame loop:
  dt = clamp(now - lastTime, 0, 0.1)  // cap at 100ms to prevent spiral
  if (!paused) {
    movementSystem(world, dt, gridSize)
    growthSystem(world, dt, season.current)
    advanceSeason(season, dt)
    harvestSystem(world, dt)
    staminaSystem(world, dt)
  }
  lastTime = now
```

---

## 26. STATE MANAGEMENT (ZUSTAND)

### Three Stores

**gameStore** (persisted to localStorage):
- `level`, `xp`, `xpToNext`
- `resources: Record<ResourceType, number>`
- `seeds: Record<string, number>`
- `unlockedSpecies: string[]`, `unlockedTools: string[]`
- `achievements: string[]`
- `totalTreesPlanted`, `totalHarvests`
- `prestigeLevel`, `prestigeBonuses`
- Actions: `addXP()`, `addResource()`, `spendResource()`, `addSeed()`, `spendSeed()`, `unlockAchievement()`, `resetForNewGame()`

**uiStore** (ephemeral):
- `screen: 'main-menu' | 'playing' | 'paused' | 'almanac'`
- `activeTool: string`, `selectedSeed: string`
- `toasts: Toast[]`
- `showSeedSelector: boolean`
- `hasSaveData: boolean`

**groveStore** (optional — grid/tree state could be ECS-only or persisted here):
- `gridSize`, `groveSeed`
- Serialized tile array and tree entities for save/load

### Persistence

Use Zustand's `persist` middleware with `name: 'grovekeeper-save'` targeting localStorage. Partialize to exclude functions. Include version number for migration.

---

## 27. SAVE SYSTEM

### Save Data Shape

```typescript
interface SaveData {
  version: 1;
  timestamp: number;
  grove: {
    gridSize: number;
    seed: string;
    tiles: { col: number; row: number; type: string }[];
    trees: {
      col: number; row: number;
      speciesId: string; meshSeed: number;
      stage: number; progress: number;
      watered: boolean; totalGrowthTime: number;
    }[];
  };
  farmer: { x: number; z: number; stamina: number };
  game: { /* gameStore state */ };
}
```

### Auto-Save Triggers

- Every 30 seconds during gameplay
- On any plant/harvest/tool action
- On `document.visibilitychange` (tab switch, app background)
- On pause menu open

### Load Flow

1. On app mount, check `localStorage.getItem('grovekeeper-save')`
2. If exists: set `hasSaveData = true`, enable Continue button
3. On Continue: deserialize, create ECS entities from save data, restore stores
4. On New Game: clear save, reset stores, generate fresh grid

---

## 28. PERFORMANCE BUDGETS

| Metric              | Target        |
| ------------------- | ------------- |
| FPS (mobile)        | ≥ 55          |
| FPS (desktop)       | ≥ 60          |
| Initial bundle (gz) | < 500 KB      |
| Time to interactive | < 3s          |
| Memory (mobile)     | < 100 MB      |
| Draw calls          | < 50          |

### Optimization Strategies

- **Tree-shake BabylonJS** — import only used classes, not barrel exports
- **Instance meshes** for same-species same-stage trees (share geometry + material)
- **Freeze world matrices** on tiles (they never move)
- **LOD** for distant trees: Full → Billboard → Hidden
- **Dynamic import** MainMenu vs GameScene (code split)
- **Texture atlas** for growth-stage decals (single draw call)
- **Shadow map**: 1024px desktop, 512px mobile
- **Reduce particle counts** on mobile
- **Passive event listeners** for touch
- **`will-change: transform`** on animated HUD elements

---

## 29. TESTING STRATEGY (TDD)

### Test First Approach

Write tests before implementation for all:
- Pure utility functions (grid math, RNG, growth calculations)
- ECS systems (mock world, verify state changes)
- Store actions (verify state transitions)
- Component rendering (mock data, verify display)

### Unit Tests (Vitest)

**gridMath.test.ts**: `gridToWorld`, `worldToGrid`, `isInBounds`, `gridDistance`, `tilesInRadius`, `indexToGrid`, `gridToIndex`

**seedRNG.test.ts**: Determinism (same seed = same sequence), distribution (roughly uniform over 10k samples), `hashString` consistency

**growthSystem.test.ts**:
- Advance sprout to sapling after threshold
- Pause growth in winter for non-evergreen
- Apply spring 1.5× bonus
- Apply water 1.3× bonus
- Respect difficulty multiplier
- Evergreen grows at 0.3× in winter
- Ghost Birch grows at 0.5× in winter

**seasonSystem.test.ts**:
- Advance day after 60 seconds
- Change season after 4 days
- Cycle back to spring after winter
- Track totalDaysElapsed

**staminaSystem.test.ts**:
- Regen at 2/sec
- Cap at maxStamina
- drainStamina returns false if insufficient

**harvestSystem.test.ts**:
- Advance cooldown
- Mark ready when complete
- Only for stage 3+
- collectHarvest resets cooldown

**gameStore.test.ts**:
- addXP triggers level up at threshold
- Level up unlocks species and tools
- spendResource returns false if insufficient
- resetForNewGame clears everything

**treeGenerator.test.ts**:
- Returns null for stage 0
- Deterministic output for same seed
- Scale increases with stage
- Old growth gets 1.2× bonus

### Component Tests (@testing-library/react)

- MainMenu: renders logo, title, buttons; Continue disabled without save
- HUD panels: render with mock data, correct display values
- ToolBelt: active tool highlighted, locked tools disabled

### Integration Tests

- **plantingFlow.test.tsx**: Select trowel → select seed → create tile entity → verify tree entity created with correct components
- **seasonCycle.test.tsx**: Advance time → verify season transitions → verify growth rate changes

### Coverage Target

- 80%+ for logic (utils, systems, stores)
- 60%+ overall

---

## 30. CODING STANDARDS

### File Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Tests: `*.test.ts(x)`
- Styles: `Component.module.css`
- Constants: `SCREAMING_SNAKE` for values

### Component Pattern

```tsx
interface Props { /* typed props */ }
export function ComponentName({ prop1, prop2 }: Props) {
  return (/* JSX */);
}
```

Always named exports, never default. Always type props with interface.

### Import Order (Biome-enforced)

1. React / framework (`react`, `react-dom`)
2. Third-party (`@babylonjs/*`, `zustand`, `nipplejs`, `miniplex`)
3. Internal absolute (`@/stores/*`, `@/utils/*`, `@/ecs/*`)
4. Relative (`./Component`, `../hooks`)
5. CSS modules (`./Component.module.css`)

### ECS System Pattern

```typescript
export function systemName(world: World<Entity>, dt: number, ...context): void {
  const entities = world.with('requiredComponent1', 'requiredComponent2');
  for (const entity of entities) {
    // Pure state mutation on entity components
  }
}
```

### Test Pattern

```typescript
describe('unitName', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## 31. BUILD ORDER — PHASED IMPLEMENTATION

### Phase 1: Foundation (Do First)

1. `pnpm init`, install all deps, configure Vite + TS + Biome
2. Create `tokens.css`, `global.css`
3. Create `constants.ts` with ALL species, tools, XP data
4. Create `gridMath.ts` + tests
5. Create `seedRNG.ts` + tests
6. Create `ecs/components.ts`, `ecs/world.ts`
7. Create all ECS systems + tests
8. Create Zustand stores + tests

### Phase 2: Scene & Rendering

9. Create `index.html` with font imports
10. Create `main.tsx` + `App.tsx` (screen router)
11. Create `GameScene.tsx` with Reactylon — empty scene, isometric camera, lighting, ground plane with GridMaterial
12. Create `SkyBox.tsx`
13. Verify: spinning camera over green grid renders at 60fps

### Phase 3: Farmer & Movement

14. Create `FarmerMesh.tsx` (primitive composition)
15. Create `VirtualJoystick.tsx` (nipple.js wrapper)
16. Create `useKeyboard.ts` hook
17. Create `FarmerController.tsx` — bridge input → ECS velocity
18. Wire `useGameLoop.ts` with `movementSystem`
19. Verify: farmer moves around grid with joystick and WASD

### Phase 4: Grid & Tiles

20. Create `GroveGrid.tsx` — initialize tile entities in ECS on mount
21. Create `Tile.tsx` — render individual tile visual
22. Create `TileHighlight.tsx` — selection ring
23. Create `useTileSelection.ts` — raycast picking
24. Verify: tap tile → highlight appears → tile info accessible

### Phase 5: Tree System

25. Create `treeGenerator.ts` + tests
26. Create `TreeRenderer.tsx` — maps tree entities to procedural meshes
27. Create `GrowthDecal.tsx` — ground overlay for growth stage
28. Wire `growthSystem` into game loop
29. Create planting flow: trowel + empty tile + seed → tree entity
30. Verify: plant a White Oak → watch it grow through stages

### Phase 6: HUD & UI

31. Create all HUD sub-components (Season, Resources, XP, Stamina, ToolBelt, Toasts)
32. Create composite `HUD.tsx`
33. Create `MainMenu.tsx` with logo SVG and Fern mascot SVG
34. Create pause menu overlay
35. Wire `ActionButton` to tool/tile context logic
36. Verify: full HUD renders correctly on mobile viewport

### Phase 7: Game Loop Polish

37. Wire `harvestSystem` — harvest mature trees for resources
38. Wire `seasonSystem` — visual season changes, growth rate effects
39. Wire `staminaSystem` — drain on actions, regen over time
40. Implement save/load with `useSaveLoad` hook
41. Verify: full loop — plant, grow, harvest, level up, save, reload

### Phase 8: Content & Retention

42. Implement all 8 species with unique mesh params
43. Implement all tools with their action logic
44. Implement achievement tracking
45. Implement daily challenge system
46. Implement prestige system
47. Grid expansion on level up

### Phase 9: Polish & Optimization

48. Add growth animations (smooth scale interpolation)
49. Add floating number particles (+XP, +Timber)
50. Add seasonal visual effects (canopy color shifts, snow, rain)
51. Performance audit: draw calls, FPS, bundle size
52. Instance mesh optimization for trees
53. Mobile testing and touch target validation
54. Accessibility pass (ARIA labels, reduced motion, color-blind mode)

---

## 32. FILE-BY-FILE MANIFEST

Each file should include a JSDoc header referencing which section of this document specifies its contents. Example:

```typescript
/**
 * Growth System
 * @see GROVEKEEPER_BUILD_PROMPT.md §15 Growth Stage System
 * @see GROVEKEEPER_BUILD_PROMPT.md §25 ECS Architecture
 */
```

**Total estimated files: ~55 source + ~15 test + ~8 config + ~8 docs = ~86 files**

### Critical Path Files (Build These First)

1. `package.json` — §1
2. `vite.config.ts` — §1
3. `tsconfig.json` — §1
4. `biome.json` — §1
5. `index.html` — §4 (font imports)
6. `src/styles/tokens.css` — §5
7. `src/styles/global.css` — §3, §4
8. `src/utils/constants.ts` — §14, §17, §18, §19, §21
9. `src/utils/gridMath.ts` — §10
10. `src/utils/seedRNG.ts` — §16
11. `src/ecs/components.ts` — §25
12. `src/ecs/world.ts` — §25
13. `src/ecs/systems/growthSystem.ts` — §15
14. `src/ecs/systems/movementSystem.ts` — §12
15. `src/ecs/systems/seasonSystem.ts` — §18
16. `src/ecs/systems/harvestSystem.ts` — §19
17. `src/ecs/systems/staminaSystem.ts` — §12
18. `src/stores/gameStore.ts` — §26
19. `src/stores/uiStore.ts` — §26
20. `src/main.tsx` + `src/App.tsx` — §8

### Documentation Files (Auto-Generate from This Prompt)

Split the relevant sections of this prompt into individual markdown files in `docs/`:

1. `docs/GAME_DESIGN_DOCUMENT.md` — §9, §10, §12, §17, §18, §19
2. `docs/BRAND_GUIDE.md` — §3, §4, §5, §6, §7
3. `docs/TECHNICAL_ARCHITECTURE.md` — §1, §2, §25, §26, §28
4. `docs/HUD_DESIGN.md` — §20
5. `docs/TREE_CATALOG.md` — §14, §15, §16
6. `docs/PROGRESSION_SYSTEM.md` — §21, §22, §23, §24
7. `docs/CONTROLS.md` — §13
8. `docs/AGENT_PLAYBOOK.md` — §29, §30, §31

---

## END OF SPECIFICATION

This document contains everything needed to build Grovekeeper from an empty directory to a playable, polished, mobile-first 2.5D tree-planting game. Every design decision has been made. Every system has been specified. Every file has been planned.

**Build it. Ship it. Grow some trees. 🌳**
