# Typography

## Font Stack

| Role    | Primary  | Fallback            | CSS Token            |
|---------|----------|---------------------|----------------------|
| Display | Fredoka  | Nunito, sans-serif  | `--gk-font-display`  |
| Body    | Nunito   | Segoe UI, sans-serif| `--gk-font-body`     |

**Display** is used for headings (`h1`-`h6`), buttons, and any bold UI label
that should feel playful and rounded. Fredoka has soft terminals that match
the game's cozy visual identity.

**Body** is used for paragraph text, descriptions, tooltips, stat labels, and
any longer-form reading. Nunito is a balanced sans-serif that pairs well with
Fredoka while remaining highly legible at small sizes on mobile screens.

## Font Loading

Fonts are loaded from Google Fonts via a `<link>` tag in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap"
  rel="stylesheet"
/>
```

### Weight subsets

| Font    | Weights loaded       | Notes                        |
|---------|----------------------|------------------------------|
| Fredoka | 400, 500, 600, 700  | 700 for buttons and headings |
| Nunito  | 400, 600, 700        | 700 for bold labels          |

The `display=swap` strategy means text renders immediately in the fallback
font and swaps once the web font loads, avoiding invisible text during the
critical first paint.

## CSS Application

Applied globally in `src/index.css` inside the `@layer base` block:

```css
body {
  font-family: var(--gk-font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--gk-font-display);
  letter-spacing: -0.02em;
}

button {
  font-family: var(--gk-font-display);
}
```

Headings use a slight negative letter-spacing (`-0.02em`) to keep Fredoka
compact at larger sizes. Buttons inherit the display font so action labels
("PLANT", "WATER", "CHOP") feel consistent with headings.

## Type Scale

| Token            | Size      | px   | Typical usage                       |
|-------------------|-----------|------|-------------------------------------|
| `--gk-text-xs`   | `0.75rem` | 12   | Keyboard badges, seed cost text     |
| `--gk-text-sm`   | `0.875rem`| 14   | Minimum body text, stat labels      |
| `--gk-text-base` | `1rem`    | 16   | Default body text, descriptions     |
| `--gk-text-lg`   | `1.25rem` | 20   | Section headings, dialog titles     |
| `--gk-text-xl`   | `1.5rem`  | 24   | Large headings, stat numbers        |
| `--gk-text-2xl`  | `2rem`    | 32   | Main menu title                     |
| `--gk-text-3xl`  | `2.75rem` | 44   | Hero text (splash, prestige banner) |

## Mobile Readability Rules

- Minimum body text: **14 px** (`--gk-text-sm`). Nothing smaller appears as
  readable content. The only exception is the `text-[10px]` size used for
  non-essential secondary labels (keyboard shortcut badges, seed count
  indicators, stamina numerics) where space is extremely constrained.

- Touch-target labels on buttons use at least `--gk-text-sm` (14 px).

- HUD numeric displays (coins, XP, resource counts) use `tabular-nums` for
  stable alignment when values change.

## Practical Examples

### HUD stat label
```tsx
<span className="text-xs font-bold" style={{ color: "#3E2723" }}>
  {resources.timber}
</span>
```

### Dialog title
```tsx
<DialogTitle style={{ color: COLORS.soilDark }}>
  Select a Seed
</DialogTitle>
```
The `DialogTitle` component inherits `font-family: var(--gk-font-display)` from
the `h1`-`h6` base rule applied by shadcn/ui.

### Action button label
```tsx
<button className="font-bold text-sm tracking-wide">
  PLANT
</button>
```
Buttons inherit Fredoka from the global `button` rule. Labels are uppercase by
convention for context-action buttons (PLANT, WATER, CHOP, CLEAR).
