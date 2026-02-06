# Tech Context — Grovekeeper

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | React | 19.x | UI layer |
| 3D Engine | BabylonJS | 8.50.x | `@babylonjs/core`, `/materials`, `/procedural-textures`, `/gui`, `/loaders` |
| ECS | Miniplex | 2.x | Entity-component-system with `miniplex-react` |
| State | Zustand | 5.x | `persist` middleware for localStorage |
| Input | nipplejs | 0.10.x | Virtual joystick for mobile |
| Styling | Tailwind CSS | 4.x | With `@tailwindcss/vite` plugin |
| UI Components | shadcn/ui | latest | Radix primitives, Tailwind styling |
| Animation | Framer Motion | 12.x | Available but sparingly used |
| Forms | React Hook Form + Zod | 7.x / 3.x | Available for settings |
| Icons | Remix Icon | 4.6.x | `@remixicon/react` |
| Icons (alt) | Lucide React | 0.503.x | Secondary icon set |
| Charts | Recharts | 2.x | Available for stats display |
| Mobile | Capacitor | 8.x | `@capacitor/core`, `/device`, `/haptics` |
| Bundler | Vite | 6.x | `@vitejs/plugin-react`, `vite-plugin-singlefile` |
| Language | TypeScript | 5.7+ | Strict mode |
| Lint/Fmt | Biome | 2.3 | Single tool, fast |
| Testing | Vitest | 4.x | `happy-dom` environment |
| Testing Lib | @testing-library/react | 16.x | Component testing |
| Package Mgr | pnpm | 9.x | Lockfile: `pnpm-lock.yaml` |

## Development Setup

```bash
# Prerequisites
node >= 20
pnpm >= 9

# Install
pnpm install

# Dev server (http://localhost:5173)
pnpm dev

# Build
pnpm build

# Test
pnpm test        # watch mode
pnpm test:run    # single run
```

## Build Configuration

### Vite (`vite.config.ts`)
- React plugin with styled-jsx babel transform (legacy, can remove)
- Tailwind CSS plugin
- `vite-plugin-singlefile` — bundles everything into single HTML
- Path alias: `@/` → `./src/`
- Next.js shim aliases (legacy): `next` → `./src/components/next`, `next-themes` → shimmed

### TypeScript (`tsconfig.json`)
- `strict: true`
- `jsx: "react-jsx"`
- `target: "ES2020"`, `module: "ESNext"`
- `moduleResolution: "bundler"`
- Path alias: `"@/*" → ["./src/*"]`

### Biome (`biome.json`)
- Organize imports: enabled
- Indent: 2 spaces
- Linter: recommended rules
- Files ignored: `dist/**`, `node_modules/**`, `coverage/**`

### Vitest (`vitest.config.ts`)
- Environment: `happy-dom`
- Setup file: `src/test/setup.ts`
- Path alias: `@/` → `./src/`

## Known Constraints

### BabylonJS Bundle Size
BabylonJS is large. Must tree-shake aggressively — import specific modules:
```typescript
// Good
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
// Bad
import { Vector3 } from "@babylonjs/core";
```

### Mobile Performance
- BabylonJS WebGL on mobile is GPU-constrained
- Shadow maps must be smaller on mobile (512px vs 1024px)
- Particle effects must be reduced or disabled
- Max 50 draw calls for smooth frame rate

### localStorage Limits
- ~5MB limit in most browsers
- Save data must be compact — serialize only essentials
- No binary data (meshes are procedural, not stored)

### Capacitor
- `capacitor.config.ts` configured for `com.grovekeeper.app`
- `webDir: 'dist'` — builds to dist/
- Android scheme: https
- Haptics and Device plugins configured
- **Not yet built** — no `ios/` or `android/` directories

## Dependencies Worth Noting

### Active & Essential
- `@babylonjs/*` — 3D rendering engine (core dependency)
- `miniplex` — ECS for game entities
- `zustand` — State management with persistence
- `nipplejs` — Virtual joystick
- `react`, `react-dom` — UI framework

### Active but Could Be Lighter
- `@radix-ui/*` (via shadcn) — Full component library, many components unused
- `framer-motion` — Heavy animation library, barely used
- `recharts` — Chart library, not yet used in game
- `react-hook-form` + `zod` — Form validation, overkill for current needs

### Legacy / Should Remove
- `styled-jsx` — Legacy from template, not needed
- `src/components/next/*` — Next.js shims, not needed
- `src/next-themes.tsx` — Theme provider shim, not needed
- Onlook iframe editor script in `index.html` — development artifact

## Tool Usage

### pnpm
- All commands via `pnpm <script>`
- Lock file: `pnpm-lock.yaml` (committed)
- Node modules: strict (no phantom deps)

### Biome
- `pnpm lint` — lint check
- `pnpm format` — auto-format
- `pnpm check` — lint + format together

### Vitest
- `pnpm test` — watch mode (default)
- `pnpm test:run` — CI single-pass
- `pnpm test:coverage` — with v8 coverage

### TypeScript
- `pnpm tsc` — full type check
- Errors are NOT blocking for `pnpm dev` (Vite ignores TS errors during dev)
