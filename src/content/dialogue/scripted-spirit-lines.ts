/**
 * Scripted Spirit lines — Sub-wave C of the Journey wave.
 *
 * The Grove Spirit speaks **three** scripted lines across the player's
 * first ~10 minutes — once on first arrival in the starter grove, once
 * after the hearth claim ritual, once after the first weapon (the
 * starter axe) is crafted. Outside these three triggers the Spirit
 * falls back to the Wave 11b phrase pools.
 *
 * Each line fires at most once per save. The "did this line fire" bit
 * lives in `dialogue_history` keyed by the synthetic ids in
 * `SCRIPTED_LINE_HISTORY_IDS`.
 */

export const SCRIPTED_SPIRIT_LINES = {
  line1: "Welcome, Gardener. Light a hearth here, and this place is yours.",
  line2: "It's beautiful. The grove is yours now.",
  line3: "Beyond the glow it's wild. Take a tool you can swing.",
} as const;

export type ScriptedSpiritLineKey = keyof typeof SCRIPTED_SPIRIT_LINES;

/**
 * Synthetic npcId used in `dialogue_history` to record that a scripted
 * line has fired. Namespaced so they cannot collide with grove Spirit
 * ids (which start with `grove-`).
 */
export const SCRIPTED_LINE_HISTORY_IDS: Readonly<
  Record<ScriptedSpiritLineKey, string>
> = {
  line1: "scripted-line1",
  line2: "scripted-line2",
  line3: "scripted-line3",
} as const;

/** Phrase ids written into `dialogue_history.last_phrase_id`. */
export const SCRIPTED_LINE_PHRASE_IDS: Readonly<
  Record<ScriptedSpiritLineKey, string>
> = {
  line1: "spirit:scripted:line1",
  line2: "spirit:scripted:line2",
  line3: "spirit:scripted:line3",
} as const;
