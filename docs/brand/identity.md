# Brand Identity

## Tagline

> "Every forest begins with a single seed."

## Brand Pillars

### Warmth
Earth tones, rounded shapes, soft shadows. The palette centers on forest greens
(`#2D6A4F`) and warm browns (`#8B6F47`). Radii default to `12px` (medium) or
`20px` (large) so nothing feels sharp. Shadows use a green-tinted `rgba(26, 58,
42, ...)` base rather than pure black.

### Growth
Everything evolves; nothing stays static. Trees progress through five stages,
the grid expands, the season wheel turns, and the player levels up. UI
transitions (150-600 ms) reinforce this constant motion.

### Wonder
Small magical moments hidden in the ordinary. Cherry blossom petals drift from
mature sakura trees. Ghost Birch bark glows at night. Crystal Oak canopies
shift prismatic hues with each season. The achievement popup arrives with a gold
flash and sparkle animation.

### Patience
Good things take time. The game is anti-hustle by design: 3-15 minute commute
sessions, idle offline growth, a prestige loop that rewards replaying rather
than rushing. The stamina bar throttles frantic tapping, encouraging the player
to step back and watch their grove breathe.

## Tone of Voice

Cozy, grounded, and quietly magical. Like tending a tiny world in a glass
terrarium. Copy is short, friendly, and avoids urgency. Tooltips end with
periods, not exclamation marks. Error messages are gentle ("Not enough stamina
-- rest a moment.").

## Visual Style

### Camera
Locked 2.5D isometric diorama view. The BabylonJS `ArcRotateCamera` is
positioned at a fixed alpha/beta angle and cannot be rotated by the player.
This creates a doll-house effect where the entire grove sits in frame.

### Rendering
Procedural geometry only -- no external 3D model files. All trees are generated
at runtime from BabylonJS primitives combined through a ported Solid Particle
System (SPS) tree generator (`src/game/utils/spsTreeGenerator.ts`). PBR
materials use 5 bark texture sets and 2 leaf texture sets loaded from
`public/textures/`.

### Lighting
Hemisphere light (ambient) plus a single directional light (sun/moon). The
directional light color and intensity shift with the day/night cycle and
season. Shadow map resolution adapts: 1024 px on desktop, 512 px on mobile.

### Frame
The game canvas is bordered by decorative wood-grain side frames. Prestige
cosmetic unlocks replace the default wood with themed borders (Stone Wall,
Vine Lattice, Enchanted Moss, Golden Trim, Ancient Runes).

## Mascot: "Fern" the Farmer

Fern is an SVG character rendered inline by `src/game/ui/FarmerMascot.tsx`.

### Appearance
- Round head with rosy cheeks and a curved smile
- Straw hat with a red band and a seedling sprouting from the crown
- Green overalls over a gold/autumn shirt
- Brown boots with dark mud patches
- Holds a shovel in the right hand
- Leaf patch on the overalls

### Behavior
- **Main menu:** Bounces gently with a 2-second `ease-in-out` CSS animation
- **Pause menu:** Static at 40 px size, displayed next to the "Grove Stats" title
- **In-game:** Represented as a low-poly 3D farmer mesh (body cylinder + head
  sphere + hat cone, assembled from BabylonJS primitives)

## Logo

Defined in `src/game/ui/Logo.tsx` as an inline SVG.

### Composition
- Three-layer elliptical tree canopy (two greens, alternating)
- Rectangular trunk in bark brown
- Root lines extending from the trunk base
- Curved ground line beneath
- "GROVE KEEPER" text centered below, set in the system font stack

The logo accepts a `size` prop (default 200) and scales proportionally.

## Color Identity

The full token list lives in [Design Tokens](design-tokens.md). The core brand
colors used across mascot, logo, and UI chrome are:

| Name          | Hex       | Role                              |
|---------------|-----------|-----------------------------------|
| Forest Green  | `#2D5A27` | Primary brand green (buttons, badges) |
| Bark Brown    | `#5D4037` | Borders, wood frame, trunk color  |
| Soil Dark     | `#3E2723` | Deepest brown (text, frame gradient) |
| Leaf Light    | `#81C784` | Positive accent, canopy highlight |
| Autumn Gold   | `#FFB74D` | XP bar fill, hat, warm accent     |
| Sky Mist      | `#E8F5E9` | Dialog backgrounds, light wash    |
| Earth Red     | `#C62828` | Danger, cost display, cancel      |
