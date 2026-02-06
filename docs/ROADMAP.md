# Grove Keeper - Development Roadmap

## Current Status: Phase 1 (Core MVP)

### Completed

- [x] Project setup (Vite, React 19, TypeScript)
- [x] BabylonJS integration with 2.5D isometric diorama view
- [x] Procedural grass/soil textures
- [x] Fixed diorama camera (no user camera control)
- [x] Decorative border trees for forest atmosphere
- [x] Miniplex ECS for entity management
- [x] Zustand store with persistence
- [x] Mobile-first nipplejs joystick (responsive sizing)
- [x] Grid-based world (12x12) with soil overlay
- [x] Player movement system
- [x] Tree growth system with stages
- [x] 6 tree species with varying difficulties
- [x] 6 tools with unlock costs
- [x] Main menu with branding
- [x] SVG logo and farmer mascot
- [x] Seed selection UI
- [x] Tool wheel UI
- [x] Pause menu with stats
- [x] Responsive HUD (coins, XP, level)
- [x] Wood-frame UI borders (tree trunk aesthetic)
- [x] Responsive design (iPhone SE to iPad to foldables)
- [x] Safe area insets for notched devices
- [x] Tool-specific action button icons
- [x] Planting mechanics
- [x] Watering mechanics
- [x] Fertilizing mechanics
- [x] Harvesting mechanics
- [x] XP and leveling system
- [x] Test suite (38 tests passing)
- [x] Biome linting/formatting
- [x] Documentation

### In Progress

- [ ] Visual feedback for watering (particles)
- [ ] Tree harvest animations
- [ ] Sound effects

---

## Phase 2: Polish & Feedback

### Visual Improvements
- [ ] Particle effects for planting
- [ ] Water droplet particles
- [ ] Growth "pop" animation
- [ ] Coin collect animation
- [ ] XP gain floating numbers
- [ ] Day/night cycle skybox
- [ ] Seasonal color variations
- [ ] Shadows for trees and player

### Audio
- [ ] Background ambient sounds
- [ ] Tool use sound effects
- [ ] Growth completion chime
- [ ] UI interaction sounds
- [ ] Level up fanfare

### UX Improvements
- [ ] Tutorial overlay for new players
- [ ] Tool tips on first use
- [ ] Grid cell highlighting when hovering
- [ ] Haptic feedback on mobile
- [ ] Pinch to zoom camera
- [ ] Double-tap to center camera

---

## Phase 3: Content Expansion

### New Tree Species
- [ ] Willow (water-loving, medium)
- [ ] Bamboo (rapid spread, hard)
- [ ] Apple (fruit bonus, medium)
- [ ] Palm (tropical, hard)
- [ ] Bonsai (decorative, expert)
- [ ] Seasonal variants (spring cherry, autumn maple)

### New Tools
- [ ] Seed pouch (carry more seeds)
- [ ] Greenhouse (protect from weather)
- [ ] Sprinkler (auto-water area)
- [ ] Compost bin (generate fertilizer)

### Grid Expansions
- [ ] Unlock additional 12x12 plots
- [ ] Different biomes (forest, desert, tropical)
- [ ] Water features (ponds, streams)
- [ ] Decorative items (benches, paths)

### Weather System
- [ ] Rain (auto-waters trees)
- [ ] Drought (trees need more water)
- [ ] Wind (affects growth rate)
- [ ] Seasons (affects species growth)

---

## Phase 4: Progression Systems

### Achievements
```
First Sprout      - Plant your first tree
Green Thumb       - Grow 100 trees to maturity
Forest Guardian   - Have 50 mature trees at once
Ancient Keeper    - Grow a tree to ancient stage
Collector         - Unlock all species
Master Gardener   - Reach level 20
Speed Grower      - Grow a tree in under 1 minute
Patient Planter   - Grow a Redwood
Rainbow Grove     - Have all species in grove at once
```

### Daily Rewards
- [ ] 7-day reward calendar
- [ ] Streak bonuses
- [ ] Special weekend events
- [ ] Daily challenges

### Prestige System
- [ ] Reset grove for permanent bonuses
- [ ] Unlock cosmetic farmer outfits
- [ ] Special tree skins
- [ ] Title badges

---

## Phase 5: Social Features

### Friend System
- [ ] Add friends via code
- [ ] Visit friend groves (read-only)
- [ ] Gift seeds to friends
- [ ] Compare stats

### Leaderboards
- [ ] Most trees planted (weekly)
- [ ] Fastest grove value growth
- [ ] Longest play streak
- [ ] Most ancient trees

### Cooperative Events
- [ ] Community planting goals
- [ ] Seasonal competitions
- [ ] Limited-time species
- [ ] Group challenges

---

## Phase 6: Monetization (Optional)

### Premium Currency (Acorns)
- [ ] Speed up growth timers
- [ ] Exclusive cosmetics
- [ ] Extra grid plots
- [ ] Rare species packs

### Cosmetics
- [ ] Farmer outfits
- [ ] Tool skins
- [ ] Tree decorations
- [ ] Grid themes

### No Pay-to-Win
- All gameplay content earnable
- Premium is cosmetic only
- No energy systems
- No mandatory ads

---

## Technical Debt & Improvements

### Performance
- [ ] Instanced mesh rendering for trees
- [ ] LOD system for distant trees
- [ ] Object pooling for particles
- [ ] Lazy load distant grid chunks
- [ ] Web Worker for growth calculations

### Code Quality
- [ ] Extract BabylonJS setup to hooks
- [ ] Add E2E tests with Playwright
- [ ] Storybook for UI components
- [ ] Performance monitoring
- [ ] Error boundary components

### Infrastructure
- [ ] Cloud save sync (optional)
- [ ] Analytics integration
- [ ] Crash reporting
- [ ] A/B testing framework
- [ ] PWA offline support

---

## Version Milestones

### v0.1.0 (Current)
Core planting gameplay loop

### v0.2.0
Visual polish and sound effects

### v0.3.0
Weather system and new species

### v0.4.0
Achievements and daily rewards

### v0.5.0
Friend system and leaderboards

### v1.0.0
Full release with all Phase 1-5 features

---

## Contributing

### Code Standards
- TypeScript strict mode
- Biome for linting/formatting
- Tests required for systems
- JSDoc for public APIs

### Commit Convention
```
feat: add watering animation
fix: tree growth not updating
docs: update API reference
test: add growth system tests
refactor: extract mesh creation
```

### Branch Strategy
- `main` - stable release
- `develop` - integration branch
- `feature/*` - new features
- `fix/*` - bug fixes
