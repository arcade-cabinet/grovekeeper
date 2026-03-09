/**
 * dialogueAnimations -- Shared animation utilities for dialogue UI (Spec SS33.5).
 *
 * Pure functions for typing animation timing and staggered slide-in delays.
 * Used by NpcDialogue (typing text) and DialogueChoices (slide-in cards).
 *
 * No React imports -- pure math only. Testable in isolation.
 */

// ---------------------------------------------------------------------------
// Typing animation
// ---------------------------------------------------------------------------

/** Milliseconds per character for typing reveal. */
export const TYPING_SPEED_MS = 28;

/** Minimum display time before allowing skip (ms). */
export const TYPING_MIN_DISPLAY_MS = 200;

/**
 * Compute how many characters should be visible at a given elapsed time.
 *
 * @param text     Full text string
 * @param elapsedMs Milliseconds since typing started
 * @param speedMs  Milliseconds per character (default: TYPING_SPEED_MS)
 * @returns Number of characters to show (0 to text.length)
 */
export function getVisibleCharCount(
  text: string,
  elapsedMs: number,
  speedMs: number = TYPING_SPEED_MS,
): number {
  if (speedMs <= 0) return text.length;
  if (elapsedMs <= 0) return 0;
  return Math.min(text.length, Math.floor(elapsedMs / speedMs));
}

/**
 * Whether the typing animation is complete for the given text.
 */
export function isTypingComplete(
  text: string,
  elapsedMs: number,
  speedMs: number = TYPING_SPEED_MS,
): boolean {
  return getVisibleCharCount(text, elapsedMs, speedMs) >= text.length;
}

/**
 * Total duration for typing the full text (ms).
 */
export function typingDuration(text: string, speedMs: number = TYPING_SPEED_MS): number {
  return text.length * speedMs;
}

// ---------------------------------------------------------------------------
// Staggered slide-in
// ---------------------------------------------------------------------------

/** Base delay before first choice slides in (ms). */
export const SLIDE_BASE_DELAY_MS = 80;

/** Delay increment between each subsequent choice (ms). */
export const SLIDE_STAGGER_MS = 60;

/**
 * Compute the slide-in delay for a choice at a given index.
 *
 * @param index Choice index (0-based)
 * @returns Delay in milliseconds
 */
export function choiceSlideDelay(index: number): number {
  return SLIDE_BASE_DELAY_MS + index * SLIDE_STAGGER_MS;
}

// ---------------------------------------------------------------------------
// NPC portrait color
// ---------------------------------------------------------------------------

/** Map an NPC name to a deterministic hue for the portrait circle. */
export function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Generate a portrait border color from an NPC name.
 * Returns an HSL color string with moderate saturation.
 */
export function portraitColor(name: string): string {
  const hue = nameToHue(name);
  return `hsl(${hue}, 55%, 45%)`;
}

/**
 * Generate a portrait background color (lighter variant).
 */
export function portraitBgColor(name: string): string {
  const hue = nameToHue(name);
  return `hsl(${hue}, 50%, 85%)`;
}
