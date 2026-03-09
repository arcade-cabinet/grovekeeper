/**
 * Grovekeeper design tokens -- JS constants for imperative StyleSheet usage.
 *
 * For className-based NativeWind styling use Tailwind classes (e.g. `text-sap`,
 * `bg-grove-deep`). This file is for components that need imperative styles.
 *
 * Aesthetic direction: Bright, whimsical Legend of Zelda feel (Wind Waker / BotW).
 */

// -- Colors: Light Mode (primary -- bright whimsical Wind Waker day) ----------
export const LIGHT = {
  bgDeep: "#E8F5E9", // saturated mint green
  bgCanopy: "#C8E6C9", // vivid light green
  bgBark: "#FFF8E1", // warm sunny cream
  bgWarm: "#FFFDE7", // bright warm white
  surfaceMoss: "#E0F2F1", // bright teal mist
  surfacePanel: "rgba(232,245,233,0.85)", // semi-transparent bright mint
  borderBranch: "#66BB6A", // saturated green border
  borderGold: "#FFC107", // warm gold accent
  textPrimary: "#1B5E20", // deep green (readable)
  textSecondary: "#2E7D32", // medium green
  textMuted: "#78909C", // blue-grey for de-emphasis
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
  sap: "#4CAF50", // health, growth, positive (saturated green)
  amber: "#FFC107", // stamina, warnings, harvest (warm gold)
  ember: "#EF5350", // danger, hunger critical, death
  frost: "#42A5F5", // water, winter, sky (vivid blue)
  blossom: "#F48FB1", // spring, spirits, rare events
  gold: "#FFD54F", // prestige, achievements (warm gold)
  biolum: "#69F0AE", // Grovekeeper spirits glow (bright mint)
  greenBright: "#4CAF50", // vibrant green for buttons
  skyBlue: "#64B5F6", // soft blue for info, secondary actions
} as const;

// -- Seasonal accent overrides ------------------------------------------------
export const SEASONAL = {
  spring: "#66BB6A",
  summer: "#43A047",
  autumn: "#FFA726",
  winter: "#42A5F5",
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
  backgroundColor: "rgba(232,245,233,0.82)",
  borderWidth: 1,
  borderColor: "rgba(102,187,106,0.5)",
  borderRadius: RADIUS.organic,
} as const;
