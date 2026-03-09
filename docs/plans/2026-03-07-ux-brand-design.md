# Grovekeeper — UX, Brand & Design System

> **Living document.** Updated as research progresses. Context-compaction safe.
> Last updated: 2026-03-07

---

## 1. Brand Identity

### Core Metaphor

Grovekeeper is **a keeper's journal made physical** — the player IS the forest warden, not a character inside it. Every UI element should feel like it belongs to an old naturalist's field kit: worn leather, pressed leaves, hand-inked labels, brass instruments.

The visual duality is intentional:
- **Exploration mode** = warm, golden-hour, curious. Like finding a forgotten garden.
- **Survival mode** = deep forest night, bioluminescent, dangerous stillness. Like being watched.

The Wind Waker-inspired visual style amplifies both: stylized low-poly geometry + organic texture = nature that feels alive but slightly unreal. Bright and whimsical, not photorealistic.

### Visual Language Principles

1. **Grown, not built** — UI elements have organic edges. Rounded corners aren't just UI convention, they reference bark and root shapes.
2. **Texture over flatness** — Panels should feel like worn paper, bark, or mossed stone. Not glass morphism — *forest morphism*.
3. **Layered depth** — Like a real forest: sky (background), canopy (mid-elements), understory (overlay panels), floor (action buttons). Elements at different Z-layers use different opacity/blur.
4. **Seasonal shifting** — Color temperature changes with season. Winter = cool desaturated. Summer = warm saturated. This applies to UI too, not just 3D scene.
5. **Data as field notes** — Stats and numbers look like they were written in a journal. Monospace for numeric readouts. Slightly off-grid alignment is intentional.

---

## 2. Color System

### Dark Mode (Primary — default in survival/night)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#0D1F0F` | Screen background, deepest layer |
| `--bg-canopy` | `#1A3A1E` | Panel backgrounds |
| `--bg-bark` | `#2C1810` | Modal backgrounds, dark surfaces |
| `--surface-moss` | `#243B27` | Card surfaces, raised elements |
| `--surface-stone` | `#2A2A25` | Input fields, inactive tabs |
| `--border-branch` | `#3D5C41` | Panel borders, dividers |
| `--text-primary` | `#E8F0E9` | Primary text (near white with green tint) |
| `--text-secondary` | `#9CB89F` | Secondary text, labels |
| `--text-muted` | `#5A7A5D` | Disabled, hints |
| `--accent-sap` | `#4ADE80` | Health, growth, positive states |
| `--accent-amber` | `#F59E0B` | Stamina, warnings, harvest rewards |
| `--accent-ember` | `#EF4444` | Danger, hunger critical, death |
| `--accent-frost` | `#93C5FD` | Water, winter, night sky |
| `--accent-blossom` | `#F9A8D4` | Spring, spirits, rare events |
| `--accent-gold` | `#FFD700` | Prestige, achievements, tier icons |
| `--accent-biolum` | `#39FF14` | Grovekeeper spirits glow (bioluminescent) |

### Light Mode (Secondary — exploration/day)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#F0FDF4` | Screen background |
| `--bg-canopy` | `#DCFCE7` | Panel backgrounds |
| `--bg-bark` | `#FEF3C7` | Warm modal backgrounds |
| `--surface-moss` | `#ECFDF5` | Card surfaces |
| `--border-branch` | `#86EFAC` | Borders |
| `--text-primary` | `#14532D` | Primary text |
| `--text-secondary` | `#166534` | Secondary |
| `--text-muted` | `#4ADE80` | Muted |

### Seasonal Accent Overrides

Applied as CSS/NativeWind class on the root container, shifts accent hues:

| Season | Primary Accent Shift | Atmosphere |
|--------|---------------------|------------|
| Spring | `--accent-sap` → pink-tinted `#86EFAC` | Soft, hopeful |
| Summer | `--accent-sap` → warm `#22C55E` | Rich, saturated |
| Autumn | `--accent-sap` → `#F59E0B` amber | Harvest warm |
| Winter | `--accent-sap` → `#93C5FD` frost | Cold, sparse |

---

## 3. Typography

### Current Stack Assessment

| Font | Current Use | Assessment |
|------|-------------|------------|
| Fredoka | Display/headings | ❌ TOO CUTE — bubbly roundness conflicts with survival gravitas |
| Nunito | Body | ✓ Acceptable — friendly but readable |

### Proposed Stack

| Role | Font | Why |
|------|------|-----|
| **Wordmark / Logo** | Cinzel Decorative | Roman serif authority. Timeless. "Carved in stone." |
| **Display / Modal titles** | Cinzel (regular) | Same family, less decorative. Serious intent. |
| **Body / Labels** | Cabin | Humanist sans. Grounded. More serious than Nunito but still warm. |
| **Numbers / Data** | JetBrains Mono | Monospace for all stats, time, coordinates. Field-notes aesthetic. |
| **Urgency / HUD readouts** | Orbitron (light use only) | For danger states, stamina critical — slightly sci-fi, signals alert |

**Rule:** Fredoka is replaced everywhere. Cinzel for anything that needs gravitas (titles, difficulty names). Cabin for UI labels. JetBrains Mono for all numbers (XP, coins, time, coordinates, temperature).

### Type Scale (React Native sp units)

| Token | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| `--type-hero` | 32sp | 700 | Cinzel Decorative | Game title, logo text |
| `--type-display` | 24sp | 600 | Cinzel | Modal titles, section headers |
| `--type-heading` | 18sp | 600 | Cabin | Card titles, tab labels |
| `--type-body` | 14sp | 400 | Cabin | Body text, descriptions |
| `--type-label` | 12sp | 500 | Cabin | Input labels, tags |
| `--type-caption` | 11sp | 400 | Cabin | Tooltips, hints |
| `--type-data` | 14sp | 400 | JetBrains Mono | All numbers in HUD |
| `--type-data-lg` | 20sp | 700 | JetBrains Mono | Large counters (XP, level) |
| `--type-critical` | 12sp | 700 | Orbitron | Danger alerts only |

---

## 4. Spacing & Shape System

### Spacing Scale (4px base)

```
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sharp` | 2px | Hard edges (some stat panels) |
| `--radius-organic` | 8px | Most panels, cards |
| `--radius-pill` | 20px | Buttons, tags, badges |
| `--radius-circle` | 9999px | Icon buttons, stamina ring |

### Elevation / Shadow

Game-specific: shadows use green-tinted black, not neutral black.

```
--shadow-sm:  0 1px 3px rgba(0,20,0,0.4)
--shadow-md:  0 4px 12px rgba(0,20,0,0.5), 0 0 0 1px rgba(77,222,128,0.08)
--shadow-lg:  0 8px 32px rgba(0,20,0,0.6), 0 0 20px rgba(74,222,128,0.12)
--shadow-glow-sap:   0 0 16px rgba(74,222,128,0.5)   /* health/growth */
--shadow-glow-amber: 0 0 16px rgba(245,158,11,0.5)   /* stamina/warning */
--shadow-glow-biolum: 0 0 24px rgba(57,255,20,0.6)   /* spirits */
```

---

## 5. Component Design Language

### Panel / Card Anatomy

All game panels follow this structure:
```
┌─ [border-branch 1px] ──────────────────────┐
│ [bark texture gradient or solid bg-canopy]  │
│                                             │
│  ▪ Title [Cinzel 18sp, text-primary]       │
│  ─────────────────── [divider border]       │
│  Content [Cabin 14sp, text-secondary]       │
│                                             │
│  [Action buttons, right-aligned]            │
└─────────────────────────────────────────────┘
```

Panels have a subtle top-left `corner notch` — 8px triangle clipped from the corner using a linear-gradient or clip-path. This references the "torn page" and "carved stone" aesthetic.

### Button Variants

| Variant | Background | Border | Use case |
|---------|-----------|--------|----------|
| `primary` | `--accent-sap` → `--bg-canopy` gradient | none | Main actions (Begin Grove, Confirm) |
| `danger` | `--accent-ember` 20% opacity | `--accent-ember` 1px | Destructive (Reset Game, Permadeath) |
| `ghost` | transparent | `--border-branch` 1px | Secondary actions |
| `hud` | `rgba(0,20,0,0.7)` backdrop blur | `--border-branch` 0.5px | All in-game overlay buttons |
| `icon-hud` | `rgba(13,31,15,0.8)` | biolum glow on active | Tool belt items, action button |

### HUD Element Style

All HUD elements are **glassmorphic forest panels**:
- Background: `rgba(13,31,15,0.75)` (deep forest dark, 75% opacity)
- Border: `1px solid rgba(61,92,65,0.6)` (branch color, semi-transparent)
- Backdrop filter: `blur(8px)` (NOT on mobile — use opacity only for perf)
- Corner notch (top-left or top-right, context dependent)

---

## 6. Screen Inventory & UX Flow

### Complete Screen Map

```
App Launch
    │
    ▼
[LoadingScreen]  ── 4 phases ──► [MainMenu]
                                      │
                          ┌───────────┴──────────┐
                          │                       │
                    [NewGameModal]         [SettingsScreen]
                          │
                    [/game route]
                          │
                    [LoadingScreen] ── terrain ready ──► [GameScreen]
                                                              │
                                    ┌─────────────────────────┤
                                    │                         │
                              [HUD overlay]           [Canvas / 3D]
                                    │
                    ┌───────────────┼──────────────────┐
                    │               │                  │
               [PauseMenu]   [SeedSelect]      [TutorialOverlay]
                    │
           ┌────────┼────────┐
           │        │        │
       [Stats]  [Progress] [Settings]

           [RadialActionMenu]  ← long-press on action button
           [QuestPanel]        ← quest icon tap
           [MiniMap]           ← map icon tap
           [FastTravelMenu]    ← campfire interact
           [BuildPanel]        ← build tool active
           [TradeDialog]       ← NPC merchant interact
           [NpcDialogue]       ← NPC tap (any)
           [DialogueChoices]   ← during dialogue branches

           ── Survival only ──
           [DeathScreen]       ← health = 0
           [PermadeathScreen]  ← Ironwood death (final)

           ── Prestige path ──
           [PrestigeModal]     ← prestige button in Progress tab
```

### Player Experience — First Session (New Player)

```
1. App opens → LoadingScreen (4 phases, tips about grove-tending)
2. MainMenu → sees "Every forest begins with a single seed" tagline
3. Taps "New Grove" → NewGameModal
4. Reads seed phrase (e.g. "Quiet Mossy Hollow") — feels like finding a name
5. Selects Exploration mode (default) OR reads Survival tiers
6. Taps "Begin Your Grove" → LoadingScreen (world generating)
7. FIRST THING SEEN: Tutorial overlay with Elder NPC greeting
8. Walks forward with virtual joystick
9. Elder gives first quest: "Plant your first White Oak"
10. Player opens tool belt → sees trowel selected
11. Taps ground → plants seed
12. Time-lapse shows sprout emerge (1 day → Sprout in ~30 seconds)
13. Quest complete → Achievement popup: "First Roots"
14. Grove grows over sessions...
```

### Player Experience — Survival Death Flow

```
Health reaches 0:
→ Screen flash red
→ Fade to black (0.5s)
→ [DeathScreen] shows:
   - "You fell in the grove" (Exploration/gentle framing)
   - Cause of death (hunger / cold / enemy)
   - Stats: Days survived, Trees planted, Level reached
   - Resource drop preview (what was lost)
   - [Return to Campfire] button (respawn)

Ironwood permadeath:
→ Same fade
→ [PermadeathScreen]:
   - "The forest reclaims what was lost"
   - Full session stats (permanent record)
   - Seed phrase displayed: "Your grove: Quiet Mossy Hollow"
   - [Remember This Grove] (share text)
   - [Begin New Grove] (resets to MainMenu)
```

---

## 7. Key Component Designs

### 7a. Stamina Ring (HUD right panel)

**Concept:** Circular SVG ring, organic segmented look.

Translating from 21st.dev `Vo2MaxCard` pattern (radial SVG progress):
```
- Outer ring: 8 segments (one per 12.5% stamina), segmented stroke
- Fill color: --accent-amber when >25%, --accent-ember when ≤25%
- Center: tool icon (current active tool)
- No text inside — purely visual
- Glow: --shadow-glow-amber when draining
- React Native: SVG via react-native-svg, NOT expo-linear-gradient
```

### 7b. RadialActionMenu (Tool Wheel)

**Concept:** Press-and-hold action button → radial items fan out. From 21st.dev `CircleMenu` + `CircularCommandMenu` patterns.

```
- Trigger: Hold action button (bottom-right HUD)
- Items fan out in a 180° arc (upper half only, so thumb reach is natural)
- 6 tools max in wheel
- Each item: 48x48 circle, icon + tool name below on hover
- Selected tool: glow border + scale 1.1
- Spring animation (300 stiffness, 25 damping)
- React Native: Animated.Value + pan gesture, positioned absolute
```

### 7c. HUD Status Chip (Health hearts / hunger bar)

**Concept:** From 21st.dev `HudStatus` pattern — compact indicator chip.

```
Exploration mode:
- Hidden (no health/hunger in exploration)

Survival mode — Hearts:
- Row of 7/5/4/3 heart icons (Lucide Heart, filled/empty)
- Each heart = 1 HP
- Critical (<2 hearts): hearts pulse red, --shadow-glow-ember
- Position: top-left, below resource bar

Survival mode — Hunger:
- Thin horizontal bar (12px height), full width of hearts row
- Color: --accent-amber → --accent-ember as it empties
- Segmented: 10 visible segments
- Tooltip: "Hunger: [n]%" on tap (mobile) or hover (desktop)
```

### 7d. Animated Game Toast

**Concept:** Minimal dark notification chip. Non-blocking.

```
Position: top-center, below compass
Stack: max 3 toasts, older slide up and fade
Anatomy:
  [icon] [message text] [optional value badge]

Examples:
  🌱 Tree planted  +12 XP
  🪵 Timber gained  +5
  ⚡ Stamina critical!
  ✦ Level up!  → Level 4

Style:
  bg: rgba(13,31,15,0.9)
  border: 1px solid --border-branch
  corner-notch: top-right 6px
  Enter: slide down from above
  Exit: fade out + slide up after 2.5s

React Native: Animated.sequence + ToastQueue state
```

### 7e. Tool Belt (HUD right panel)

**Concept:** Vertical strip of tool slots, selected highlighted.

```
Layout: 4 visible slots (scroll if more unlocked)
Slot anatomy:
  [44x44 pressable]
    → tool icon (Lucide or custom)
    → unlock level badge (bottom-right corner, if locked)
    → selected: glow border --accent-sap, scale 1.05
    → locked: 40% opacity + lock icon overlay

Scroll: vertical ScrollView with snap
No horizontal layout — portrait-first
```

### 7f. Compass (HUD top-center)

**Concept:** Minimal arrow pointing to nearest spirit.

```
When NO spirit to find: hidden entirely (not placeholder)
When spirit exists:
  Arrow: unicode ↑ rotated by bearing degrees
  Container: 32x32 rounded-full, bg transparent
  No label, no bearing text
  Glow: --accent-biolum pulse animation (spirit = bioluminescent)

On tap: shows "Spirit detected — N bearing" toast
```

### 7g. Action Button (HUD bottom-right)

**Concept:** Large, tactile press button. Primary game interaction.

```
Size: 64x64 minimum (thumb-friendly)
Style:
  Default: bg-surface-moss, border-branch border, Lucide icon centered
  Active tool indicator: small pill above button showing tool name
  On press: scale 0.92 + haptic pulse
  Hold: triggers RadialActionMenu fan-out

States by tool:
  Trowel (no seed selected): dimmed, label "No Seed"
  Trowel (seed selected): bright sap-green, label "Plant [species]"
  Axe: amber, label "Chop"
  Watering Can: frost-blue, label "Water"
  etc.
```

---

## 8. Main Menu Redesign

### Current State
Logo + mascot farmer + tagline + two big buttons.

### Proposed State

**Layout (portrait 375px):**
```
┌─────────────────────────────┐
│   [Full-bleed 3D preview]   │  ← Animated scene: tree growing, seasons cycling
│   [fog at bottom]           │
│                             │
│  ┌───────────────────────┐  │
│  │  GROVEKEEPER          │  │  ← Cinzel Decorative, text-primary
│  │  [leaf divider line]  │  │
│  │  Every forest begins  │  │  ← Cabin italic, text-secondary
│  │  with a single seed.  │  │
│  └───────────────────────┘  │
│                             │
│  [Continue Grove] ──────────┤  ← Primary button, only if save exists
│  [New Grove] ───────────────┤  ← Primary or ghost depending on save
│  [Settings] ────────────────┤  ← Ghost button
│                             │
│  [Grovekeeper v1.0.0] ──────┤  ← version, tiny, muted
└─────────────────────────────┘
```

**Background:** The 3D R3F canvas renders a miniature grove scene (zoomed out, fixed seed, no player). Trees sway slightly. Seasonal fog rolls in. This is the "living main menu" pattern.

**When save exists:** Shows save summary above buttons:
```
┌──────────────────────────────┐
│ 🌳 Quiet Mossy Hollow        │
│    Level 7 · Day 42 · Spring │
│    23 trees · 4 species       │
└──────────────────────────────┘
```

---

## 9. New Game Modal Redesign

### Current Issues
- Emoji unicode showing as literal escape codes (`\u{1F331}`)
- Survival tiers not driven from config (SURVIVAL_TIERS duplicate in component)
- Mode toggle (Exploration/Survival) works but needs visual polish
- No visual hierarchy — everything is same visual weight

### Proposed Redesign

**Phase 1: World Seed**
```
[Grove Name]
[Text showing current seed phrase]   [🔀 Shuffle]

"Your grove's name is its destiny."
```

**Phase 2: Mode Selection (full-width toggle)**
```
[🌿 Exploration]  [⚔ Survival]
    Cozy               Challenge
```

**Phase 3a: Exploration (no sub-choice needed)**
```
✓ No hunger or health systems
✓ Grow at your own pace
✓ All seasons, all species
```

**Phase 3b: Survival tier selector (if Survival chosen)**

4 cards in 2x2 grid, each with:
```
┌───────────┐
│  [emoji]  │
│  Gentle   │  ← Cinzel heading
│  ❤❤❤❤❤❤❤ │  ← heart icons (maxHearts)
│  Forgiving│  ← tagline, small
│  survival │
└───────────┘
```
Active tier: glowing border + scale up.

**Permadeath toggle:** Only shows if tier allows optional. Ironwood always shows "Permadeath is permanent."

---

## 10. Pause Menu Redesign

### Tab System
Current 3 tabs (Stats / Progress / Settings) → keep but restyle.

**Tab Bar:**
```
─────────────────────────────────────────
  [Codex] [Grove] [World] [Settings]
─────────────────────────────────────────
```
Rename tabs to be more game-native:
- "Stats" → "Grove" (your grove's progress)
- "Progress" → "World" (achievements, prestige, cosmetics)
- "Settings" → "Settings" (keep)
- Add: "Codex" (species discovered, lore, bestiary)

**Grove Tab (was Stats):**
```
[Level badge + XP ring] [Prestige count]
─────────────────────────────────────────
Trees Planted    ░░░░░░░░░░ 47
Trees Matured    ░░░░░░░░░░ 23
Species          ░░░░░░░░░░ 6/15
Tools            ░░░░░░░░░░ 4/12
Grid Size        16x16 → 24x24 [Expand]
─────────────────────────────────────────
[Expand Grove]   [Prestige]
```

---

## 11. Death & Permadeath Screen Designs

### DeathScreen (survival, non-permadeath)

```
[Full screen dark overlay, 80% opacity]

     ╔════════════════════╗
     ║   YOU HAVE FALLEN  ║   ← Cinzel Display, --accent-ember
     ╠════════════════════╣
     ║                    ║
     ║ Cause: Hunger      ║
     ║ Day 12 · Night     ║
     ║                    ║
     ║ Trees planted: 8   ║
     ║ Level: 3           ║
     ║                    ║
     ║ Resources lost:    ║
     ║  ·  Timber: 12     ║
     ║  ·  Sap: 5         ║
     ╠════════════════════╣
     ║  [Return to Fire]  ║   ← primary button
     ╚════════════════════╝
```

### PermadeathScreen (Ironwood)

```
[Full screen: deep black, slow particle fall (ash/leaves)]

     "The forest reclaims
      what was lost."

     ─────────────────────
     Quiet Mossy Hollow
     ─────────────────────

     Days survived:    47
     Trees planted:   103
     Level reached:    11
     Species found:   7/15

     ─────────────────────

     [Share Your Grove]
     [Begin New Grove]
```

---

## 12. 21st.dev Component Findings — Web→RN Translation Map

These components were found via 21st.dev Magic MCP and contain patterns to adapt for React Native. All use Tailwind+framer-motion (web), which must be translated to NativeWind+Animated/Reanimated.

### Usable Patterns Found

| 21st.dev Component | Pattern to Extract | RN Translation |
|--------------------|-------------------|----------------|
| **HUD Button** | HyperText scramble animation on press | Animated.Value + random char shuffle on press |
| **Hud Status** | Status chip with gradient border + variant colors | View + LinearGradient border trick |
| **Animated HUD Targeting UI** | SVG targeting reticle, animated paths | react-native-svg + Animated |
| **Vo2MaxCard (Progress)** | Radial SVG progress ring | react-native-svg Circle + strokeDashoffset |
| **AnimatedProgressCard** | Horizontal animated progress bar | Animated.timing on width |
| **Health Stat Card** | Multi-stat overview with sparkline bars | Custom View layout + Animated bars |
| **Circle Menu** | `pointOnCircle()` math for radial layout | Same math + Animated.spring per item |
| **Circular Command Menu** | Full-screen radial palette with keyboard nav | Modal + PanGestureHandler for touch |
| **Gaming Login** | Video/animated background + frosted glass card | Canvas R3F background + View overlay |

### Math Reusable Directly
```typescript
// From CircleMenu — works in RN without changes
const pointOnCircle = (i: number, n: number, r: number, cx = 0, cy = 0) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
};
```

### Key Dependency Translations
| Web | React Native |
|-----|-------------|
| `framer-motion` | `react-native-reanimated` (withSpring, withTiming) |
| `motion.div` animate | `Animated.View` or `Reanimated Animated.View` |
| Tailwind `blur()` | `StyleSheet` with `overflow: hidden` + `backgroundColor` opacity |
| CSS `clip-path` | `react-native-svg` `ClipPath` |
| SVG inline | `react-native-svg` Svg + Circle/Path |
| `backdrop-blur` | NOT SUPPORTED in RN → use `rgba(r,g,b,0.85)` instead |
| `position: fixed` | `StyleSheet.absoluteFillObject` |
| `z-index` stacking | RN render order (later = on top) + `zIndex` style |

---

## 13. Implementation Priority Queue

Based on brand research and UX audit, in order:

### Sprint 1: Foundation (brand tokens + typography)
1. Replace Fredoka with Cinzel Decorative + Cinzel (expo-google-fonts)
2. Replace config/theme.json with the full token set defined in §2 above
3. Add JetBrains Mono for all numeric readouts in HUD
4. Create `components/ui/tokens.ts` exporting all design tokens as JS constants

### Sprint 2: Core HUD Polish
5. Stamina ring → SVG radial ring (react-native-svg)
6. Toast redesign → corner-notch anatomy, slide-down animation
7. Action button → tactile press (scale + haptic), state-aware labeling
8. Resource bar → monospace numbers, icon improvements

### Sprint 3: Main Menu + New Game
9. Main Menu → living 3D background canvas, Cinzel branding
10. Save preview card (when save exists)
11. New Game Modal → fix emoji display, survival tier cards grid, config-driven

### Sprint 4: Overlays & Modals
12. Pause Menu → rename tabs, restyle to dark forest panels
13. Death screen (survival)
14. Permadeath screen (Ironwood)
15. Prestige confirmation modal (extract from pause menu tabs)

### Sprint 5: Radial Menu + Touch
16. RadialActionMenu → CircleMenu pattern, spring animation, 180° arc
17. Tool Belt → snap scroll, locked state, glow selection
18. Touch feedback → all interactive elements get haptic + scale press

---

## 14. Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `config/theme.json` | Rewrite | Full token set from §2 |
| `components/ui/tokens.ts` | Create | JS token exports |
| `components/ui/typography.ts` | Create | Font family + scale exports |
| `components/ui/StaminaRing.tsx` | Create | SVG radial stamina component |
| `components/ui/GameToast.tsx` | Rewrite | Dark toast with corner notch |
| `components/ui/Panel.tsx` | Create | Base panel with corner notch, dark bg |
| `components/game/DeathScreen.tsx` | Create | Death + permadeath screens |
| `components/game/PrestigeModal.tsx` | Create | Standalone prestige confirmation |
| `app/index.tsx` | Modify | Main menu with 3D background + save card |
| `components/game/NewGameModal.tsx` | Rewrite | Tier grid, emoji fix, config-driven |
| `components/game/HUD.tsx` | Modify | Font tokens, stamina ring, compass glow |
| `components/game/PauseMenu/` | Modify | Tab rename, panel restyle |

---

## 15. Open Questions / Decisions Needed

1. **3D background on main menu**: Adds R3F Canvas to main menu screen. Perf cost on low-end Android?
2. **Cinzel font licensing**: Cinzel is Google Fonts OFL — free to use in commercial app.
3. **react-native-svg dependency**: Already in project? Check `package.json`.
4. **Radial menu gesture**: Long-press vs dedicated button? User research needed.
5. **Seasonal UI shift**: Implement as React context or derive from store's `currentSeason`?
6. **Dark/Light toggle**: Should exploration = light mode auto, survival = dark mode auto? Or user preference?

---

*End of document — continue research in new sessions by referencing this file.*
