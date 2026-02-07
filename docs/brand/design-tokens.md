# Design Tokens

All CSS custom properties are defined in `src/index.css` under the `:root`
selector. They follow the naming convention `--gk-<category>-<name>` and are
referenced throughout both Tailwind classes and inline styles.

Source of truth: the `/* Grovekeeper Design Tokens (section 5) */` block in
`src/index.css`.

---

## Primary -- "Forest Floor"

| Token               | Value     | Usage                                  |
|----------------------|-----------|----------------------------------------|
| `--gk-deep-canopy`  | `#1A3A2A` | Darkest green. Headers, dark backgrounds. |
| `--gk-grove-green`  | `#2D6A4F` | Primary action color. Buttons, links.    |
| `--gk-moss`         | `#4A7C59` | Secondary green. Borders, accents.       |
| `--gk-sage-mist`    | `#7FB285` | Light accent green. Hover states.        |
| `--gk-morning-dew`  | `#C8E6C9` | Lightest green. Highlights, badges.      |
| `--gk-parchment`    | `#F5F0E3` | Paper tone. Card backgrounds, panels.    |

## Earth -- "Rich Soil"

| Token              | Value     | Usage                                    |
|---------------------|-----------|------------------------------------------|
| `--gk-heartwood`   | `#5C3D2E` | Darkest brown. Deep accents.             |
| `--gk-bark-brown`  | `#8B6F47` | Medium brown. Borders, trunk color.      |
| `--gk-warm-clay`   | `#C49A6C` | Light brown accent. Warm highlights.     |
| `--gk-dry-straw`   | `#D4C5A0` | Lightest earth. Subtle backgrounds.      |

## Seasonal

| Token                 | Value     | Usage                       |
|------------------------|-----------|------------------------------|
| `--gk-spring-bloom`   | `#E8A0BF` | Spring UI tints, cherry petals |
| `--gk-summer-gold`    | `#E9C46A` | Summer warmth, golden accents  |
| `--gk-autumn-ember`   | `#E76F51` | Autumn foliage, harvest hues   |
| `--gk-winter-frost`   | `#A8DADC` | Winter chill, frost overlays   |

## Functional

| Token           | Value     | Usage                                |
|------------------|-----------|--------------------------------------|
| `--gk-success`  | `#52B788` | Positive feedback, stamina full      |
| `--gk-warning`  | `#F4A261` | Caution, stamina mid-range           |
| `--gk-danger`   | `#E76F51` | Error, stamina critical, delete      |
| `--gk-info`     | `#6AADCF` | Informational toasts, water actions  |

---

## Typography

| Token              | Value                                      | Usage                |
|---------------------|--------------------------------------------|----------------------|
| `--gk-font-display`| `'Fredoka', 'Nunito', sans-serif`          | Headings, buttons    |
| `--gk-font-body`   | `'Nunito', 'Segoe UI', sans-serif`         | Body text, labels    |

See [Typography](typography.md) for font loading and application details.

## Type Scale

| Token            | Value      | Equivalent |
|-------------------|-----------|------------|
| `--gk-text-xs`   | `0.75rem` | 12 px      |
| `--gk-text-sm`   | `0.875rem`| 14 px      |
| `--gk-text-base` | `1rem`    | 16 px      |
| `--gk-text-lg`   | `1.25rem` | 20 px      |
| `--gk-text-xl`   | `1.5rem`  | 24 px      |
| `--gk-text-2xl`  | `2rem`    | 32 px      |
| `--gk-text-3xl`  | `2.75rem` | 44 px      |

Minimum body text is 14 px (`--gk-text-sm`) to meet mobile readability
requirements.

## Border Radii

| Token              | Value    | Usage                              |
|---------------------|----------|------------------------------------|
| `--gk-radius-sm`   | `6px`   | Small chips, badges                |
| `--gk-radius-md`   | `12px`  | Cards, panels, default radius      |
| `--gk-radius-lg`   | `20px`  | Dialogs, prominent containers      |
| `--gk-radius-full` | `9999px`| Pills, circular buttons, joystick  |

## Spacing

| Token          | Value  |
|-----------------|--------|
| `--gk-space-1` | `4px`  |
| `--gk-space-2` | `8px`  |
| `--gk-space-3` | `12px` |
| `--gk-space-4` | `16px` |
| `--gk-space-5` | `24px` |
| `--gk-space-6` | `32px` |
| `--gk-space-7` | `48px` |
| `--gk-space-8` | `64px` |

The scale is a hybrid 4/8 progression. Use `--gk-space-2` (8 px) as the base
gap and `--gk-space-4` (16 px) as the standard padding.

## Shadows

| Token             | Value                                      | Usage                  |
|--------------------|---------------------------------------------|------------------------|
| `--gk-shadow-sm`  | `0 2px 6px rgba(26, 58, 42, 0.1)`          | Subtle lift, badges    |
| `--gk-shadow-md`  | `0 4px 12px rgba(26, 58, 42, 0.15)`        | Cards, panels          |
| `--gk-shadow-lg`  | `0 8px 24px rgba(26, 58, 42, 0.2)`         | Modals, popovers       |
| `--gk-shadow-glow`| `0 0 16px rgba(82, 183, 136, 0.3)`         | Achievement glow, focus |

All shadows use a green-tinted base (`rgba(26, 58, 42, ...)`) rather than pure
black. This keeps shadows warm and cohesive with the forest palette.

## Transitions

| Token                  | Value                                   | Usage                      |
|-------------------------|-----------------------------------------|----------------------------|
| `--gk-transition-fast` | `150ms ease-out`                        | Hover, active states       |
| `--gk-transition-base` | `250ms ease-out`                        | Default UI transitions     |
| `--gk-transition-slow` | `400ms cubic-bezier(0.4, 0, 0.2, 1)`   | Panel open/close           |
| `--gk-transition-grow` | `600ms ease-in-out`                     | Growth stage interpolation |

## Z-Index Layers

| Token             | Value | Contents                           |
|--------------------|-------|------------------------------------|
| `--gk-z-ground`   | `0`   | Terrain, grass, grid tiles         |
| `--gk-z-decals`   | `10`  | Soil highlights, path markings     |
| `--gk-z-entities` | `20`  | Trees, player, NPCs               |
| `--gk-z-effects`  | `30`  | Weather overlay, growth particles  |
| `--gk-z-hud`      | `100` | HUD bar, tool belt, stamina gauge  |
| `--gk-z-modal`    | `200` | Dialogs (seed select, pause menu)  |
| `--gk-z-toast`    | `300` | Toast notifications                |
| `--gk-z-joystick` | `400` | Joystick (must stay above all UI)  |

---

## Tailwind / shadcn Integration

In addition to the Grovekeeper tokens above, `src/index.css` contains a
standard shadcn/ui `@theme inline` block that maps `--background`,
`--foreground`, `--primary`, and other shadcn variables to oklch values. These
are used by the `components/ui/` components (Button, Dialog, Card, etc.) and
coexist with the `--gk-*` tokens. The Grovekeeper tokens take precedence in
game UI styling.
