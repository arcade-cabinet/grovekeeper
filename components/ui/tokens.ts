/**
 * Grovekeeper design tokens -- JS constants for imperative StyleSheet usage.
 *
 * For className-based NativeWind styling use Tailwind classes (e.g. `text-sap`,
 * `bg-grove-deep`). This file is for components that need imperative styles.
 *
 * Aesthetic direction: Bright, whimsical Legend of Zelda feel (Wind Waker / BotW).
 */

// -- Colors: Light Mode (primary -- bright whimsical day) ---------------------
export const LIGHT = {
  bgDeep: "#F0FDF4", // soft mint
  bgCanopy: "#DCFCE7", // light green
  bgBark: "#FEF3C7", // warm cream
  bgWarm: "#FFFBEB", // warm white
  surfaceMoss: "#ECFDF5", // light teal
  surfacePanel: "rgba(240,253,244,0.88)", // semi-transparent mint
  borderBranch: "#86EFAC", // bright green
  borderGold: "#FFD700", // gold accent
  textPrimary: "#14532D", // deep forest green
  textSecondary: "#166534", // medium forest green
  textMuted: "#6B7280", // neutral gray for de-emphasis
} as const;

// -- Colors: Dark Mode (secondary -- night-time / contrast) -------------------
export const DARK = {
  bgDeep: "#0D1F0F",
  bgCanopy: "#1A3A1E",
  bgBark: "#2C1810",
  surfaceMoss: "#243B27",
  surfaceStone: "#2A2A25",
  borderBranch: "#3D5C41",
  textPrimary: "#E8F0E9",
  textSecondary: "#9CB89F",
  textMuted: "#5A7A5D",
} as const;

// -- Accent colors (shared across modes) --------------------------------------
export const ACCENT = {
  sap: "#4ADE80", // health, growth, positive
  amber: "#F59E0B", // stamina, warnings, harvest
  ember: "#EF4444", // danger, hunger critical, death
  frost: "#93C5FD", // water, winter, night sky
  blossom: "#F9A8D4", // spring, spirits, rare events
  gold: "#FFD700", // prestige, achievements
  biolum: "#39FF14", // Grovekeeper spirits glow
  greenBright: "#22C55E", // vibrant green for buttons
} as const;

// -- Seasonal accent overrides ------------------------------------------------
export const SEASONAL = {
  spring: "#86EFAC",
  summer: "#22C55E",
  autumn: "#F59E0B",
  winter: "#93C5FD",
} as const;

// -- Font families (match keys registered in useFonts) ------------------------
export const FONTS = {
  display: "CinzelDecorative", // wordmark, logo
  heading: "Cinzel", // modal titles, section headers
  body: "Cabin", // body text, labels
  data: "JetBrainsMono", // all numbers in HUD
  critical: "Orbitron", // danger alerts only
} as const;

// -- Type scale (sp units) ----------------------------------------------------
export const TYPE = {
  hero: { fontSize: 32, fontWeight: "700" as const, fontFamily: FONTS.display },
  display: { fontSize: 24, fontWeight: "600" as const, fontFamily: FONTS.heading },
  heading: { fontSize: 18, fontWeight: "600" as const, fontFamily: FONTS.body },
  body: { fontSize: 14, fontWeight: "400" as const, fontFamily: FONTS.body },
  label: { fontSize: 12, fontWeight: "500" as const, fontFamily: FONTS.body },
  caption: { fontSize: 11, fontWeight: "400" as const, fontFamily: FONTS.body },
  data: { fontSize: 14, fontWeight: "400" as const, fontFamily: FONTS.data },
  dataLg: { fontSize: 20, fontWeight: "700" as const, fontFamily: FONTS.data },
  critical: { fontSize: 12, fontWeight: "700" as const, fontFamily: FONTS.critical },
} as const;

// -- Spacing scale (4px base) -------------------------------------------------
export const SPACE = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

// -- Border radius ------------------------------------------------------------
export const RADIUS = {
  sharp: 2,
  organic: 8,
  pill: 20,
  circle: 9999,
} as const;

// -- HUD panel base style (bright semi-transparent with green accent) ---------
export const HUD_PANEL = {
  backgroundColor: "rgba(240,253,244,0.85)",
  borderWidth: 1,
  borderColor: "rgba(134,239,172,0.6)",
  borderRadius: RADIUS.organic,
} as const;
