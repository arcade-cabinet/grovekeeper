/**
 * dialogueSystem — Wave 11b.
 *
 * Pure phrase selector for grove NPCs. Given a speaker, a small
 * context bag, and the last-said phrase id (from `dialogueRepo`),
 * returns the next phrase to display.
 *
 * Design notes:
 *   - **Pure function.** History is *passed in*, never loaded from a
 *     repo here, so the selector is trivially testable with no DB
 *     mocking. Persistence is the caller's job.
 *   - **Deterministic when given an explicit `random`.** Production
 *     callers pass a `scopedRNG(...)` so two players on the same world
 *     seed encountering the same NPC in the same context get repeatable
 *     dialogue (matters for replay / regression debugging).
 *   - **Repeat avoidance.** The selector filters out the candidate
 *     whose id matches `lastPhraseId` *before* drawing — so the same
 *     phrase is never picked twice in a row (within the same pool).
 *     If the pool has only one phrase, the filter degrades gracefully
 *     and returns it anyway (better to repeat than to crash).
 *   - **Tag layering.** For non-first encounters, ~30% of rolls swap
 *     the base "general" / "returning-greet" tag for a time-of-day
 *     bucket, so the NPC feels diurnally aware without flooding the
 *     player with weather flavour.
 */

import type { TimeOfDay } from "@/systems/time";
import {
  type DialogueTimeBucket,
  phraseId,
  SPIRIT_PHRASES,
  VILLAGER_PHRASES,
} from "@/content/dialogue/phrase-pools";

export type Speaker = "spirit" | "villager";

/** Selector context. Same shape for both speakers. */
export interface DialogueContext {
  /**
   * True iff this is the player's first interaction with this specific
   * NPC. The Spirit uses this to fire its `first-greet` pool; villagers
   * ignore it (their pools don't differentiate first-meet).
   */
  firstMeet: boolean;
  /**
   * Current in-game time of day. Folded into a 4-bucket scheme; if
   * omitted, the time-of-day branch is skipped.
   */
  timeOfDay?: TimeOfDay;
}

/** Result shape — both the resolved id and the literal string. */
export interface PhrasePick {
  id: string;
  text: string;
  tag: string;
}

/**
 * 8-bucket → 4-bucket fold. Matches `phrase-pools.ts:DialogueTimeBucket`
 * and is exported so tests can assert the mapping without re-importing
 * `time.ts`.
 */
export function timeOfDayBucket(t: TimeOfDay): DialogueTimeBucket {
  // Dawn + morning → morning; noon + afternoon → midday;
  // dusk + evening → evening; night + midnight → night.
  switch (t) {
    case "dawn":
    case "morning":
      return "morning";
    case "noon":
    case "afternoon":
      return "midday";
    case "dusk":
    case "evening":
      return "evening";
    case "night":
    case "midnight":
      return "night";
  }
}

/** Probability of swapping base tag for time-of-day bucket on each pick. */
const TIME_OF_DAY_SWAP_PROBABILITY = 0.3;

/** Default `random()` source — `Math.random` is fine for run-time NPC. */
const defaultRandom = (): number => Math.random();

/**
 * Pick the next phrase for the given speaker + context. Pure function.
 *
 * @param speaker        Which pool to pull from.
 * @param ctx            First-meet flag + optional time of day.
 * @param lastPhraseId   The most recently said phrase id for this NPC,
 *                       or `null` if we have no history. Filtered out
 *                       of the candidate set when the pool has > 1
 *                       phrase. Pass the value from `dialogueRepo`.
 * @param random         Optional random source for determinism in tests.
 */
export function pickPhrase(
  speaker: Speaker,
  ctx: DialogueContext,
  lastPhraseId: string | null,
  random: () => number = defaultRandom,
): PhrasePick {
  const tag = chooseTag(speaker, ctx, random);
  const pool = poolFor(speaker, tag);
  return pickFromPool(speaker, tag, pool, lastPhraseId, random);
}

/**
 * Pick the tag (pool key) to use for this encounter. The Spirit fires
 * `first-greet` once per NPC; everything else falls into a coin-flip
 * between the speaker's "base" returning tag and a time-of-day bucket.
 */
function chooseTag(
  speaker: Speaker,
  ctx: DialogueContext,
  random: () => number,
): string {
  if (speaker === "spirit" && ctx.firstMeet) {
    return "first-greet";
  }

  const base = speaker === "spirit" ? "returning-greet" : "general";

  // No time-of-day passed in → always base tag.
  if (!ctx.timeOfDay) return base;

  // Coin flip: swap to time bucket ~TIME_OF_DAY_SWAP_PROBABILITY of the
  // time. Otherwise stay on base tag.
  if (random() < TIME_OF_DAY_SWAP_PROBABILITY) {
    return `time-of-day-${timeOfDayBucket(ctx.timeOfDay)}`;
  }
  return base;
}

/**
 * Resolve a (speaker, tag) pair to the phrase pool. Falls back to the
 * speaker's base pool if the tag is missing — paranoid path so a
 * future tag-string typo cannot crash the dialogue surface.
 */
function poolFor(speaker: Speaker, tag: string): readonly string[] {
  const pools = speaker === "spirit" ? SPIRIT_PHRASES : VILLAGER_PHRASES;
  if (tag in pools) {
    return pools[tag];
  }
  // Fallback. "first-greet" is Spirit-only; villagers always fall back
  // to "general" if a Spirit-style tag leaks in.
  const fallback = speaker === "spirit" ? "returning-greet" : "general";
  return pools[fallback];
}

/**
 * Pick from a non-empty pool, filtering out the just-said phrase id
 * if the pool has more than one element. Pure function.
 */
function pickFromPool(
  speaker: Speaker,
  tag: string,
  pool: readonly string[],
  lastPhraseId: string | null,
  random: () => number,
): PhrasePick {
  if (pool.length === 0) {
    // Not reachable in practice — the test floor is 5 — but the
    // tighter type / nicer error beats throwing inside the selector.
    return { id: phraseId(speaker, tag, -1), text: "", tag };
  }

  const candidates: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    if (phraseId(speaker, tag, i) === lastPhraseId) continue;
    candidates.push(i);
  }
  // If filtering left us with nothing (pool size 1 or every entry was
  // the last said somehow), fall back to picking from the full pool.
  const indexes = candidates.length > 0 ? candidates : Array.from(pool.keys());

  const pick = indexes[Math.floor(random() * indexes.length)];
  return {
    id: phraseId(speaker, tag, pick),
    text: pool[pick],
    tag,
  };
}
