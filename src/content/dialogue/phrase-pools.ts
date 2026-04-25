/**
 * Phrase pools — Wave 11b.
 *
 * Declarative tag-keyed flavor lines for the Grove Spirit and the
 * Neanderthal villagers that populate claimed groves.
 *
 * Design constraints (locked by the RC redesign spec, "Grove Spirit"
 * and "NPCs in groves" sections):
 *   - **Phrase-pool dialogue ONLY.** No branching trees, no choices,
 *     no quest chains, no fetch tasks, no "I need X" requests. The
 *     reward in this game is what the player BUILDS, not what NPCs
 *     ask of them.
 *   - Tone is warm, slow, Ghibli-cozy. The grove is a place where
 *     time slows down — the dialogue should reflect that.
 *   - Each tag-keyed pool MUST have at least 5 phrases (asserted in
 *     `phrase-pools.test.ts`). Most ship with 8-15.
 *
 * Phrase ids are derived as `<speaker>:<tag>:<index>` at lookup time
 * by `dialogueSystem.ts` so the persisted last-said pointer is stable
 * even if pool ordering churns between releases.
 */

/**
 * Time-of-day buckets used as dialogue tag suffixes. We collapse the
 * 8-state `TimeOfDay` from `src/systems/time.ts` into 4 buckets to
 * keep the per-bucket pool sizes meaningful — at 8 buckets we'd be
 * stretching for 5+ phrases each.
 */
export type DialogueTimeBucket = "morning" | "midday" | "evening" | "night";

/**
 * Grove Spirit phrase pools. The Spirit is the singular, mythic
 * presence at the centre of every grove — "first-greet" fires once
 * per grove (the first time the player walks into talking range);
 * everything else is sampled from "returning-greet" + the optional
 * time-of-day bucket.
 *
 * The id-keys are referenced by `phrase-pools.test.ts` and by
 * `dialogueSystem.ts`; do not rename a key without updating both.
 */
export const SPIRIT_PHRASES: Readonly<Record<string, readonly string[]>> = {
  // Played on the *first* encounter with this grove's Spirit. Subsequent
  // encounters fall through to "returning-greet" + the time/biome tags.
  "first-greet": [
    "Welcome, Gardener. The grove has been waiting.",
    "I felt you before I saw you. Welcome to this place.",
    "Ah. A keeper, here at last. Be at ease — nothing wild walks these stones.",
    "The light remembered your shape. Come closer.",
    "Soft footstep. Soft heart. You are welcome here.",
    "The roots told me someone gentle was on the path. They were right.",
    "Step in, Gardener. The grove holds its breath for you.",
  ],

  // Played on every subsequent visit when the player approaches and
  // interacts with the Spirit. These are the most common Spirit lines.
  "returning-greet": [
    "Good to see you again.",
    "The grove sang a little when it heard you on the path.",
    "You return. The light is glad of it.",
    "Welcome back, Gardener.",
    "I have been listening to the wind. It tells me you have been busy.",
    "Rest a moment. The wild can wait.",
    "The same hands that planted the first seed still hold something tender. Yours, perhaps.",
    "I am pleased you came back. Tend something today, if you would.",
  ],

  // Time-of-day flavour. Picked ~30% of the time as a substitute for
  // "returning-greet" so the Spirit feels diurnally aware.
  "time-of-day-morning": [
    "The dew is thick this morning. The grove drinks first.",
    "Morning light. I had almost forgotten how it tastes.",
    "Good morning, Gardener. The world has begun without us — let us catch up gently.",
    "The grass stood up early. I think it likes you.",
    "First light always finds the spirit blooms before it finds me.",
  ],
  "time-of-day-midday": [
    "The sun is high. The grove keeps cool, even now.",
    "Midday. Even the bees are taking a slow breath.",
    "The heart of the day is a long, warm pause. Sit if you wish.",
    "Light pools on every leaf. The grove is full.",
    "Hot above, cool below. That is the grove's old trick.",
  ],
  "time-of-day-evening": [
    "Evening softens everything. Even me.",
    "The light is leaving in golden steps. I love this hour.",
    "When the sun lays down, the spirit blooms wake up. Watch.",
    "Evening, Gardener. A fine hour to do nothing well.",
    "The shadows grow long. The grove grows quiet.",
  ],
  "time-of-day-night": [
    "The fireflies are bright tonight.",
    "Night in the grove is a soft thing — nothing here will harm you.",
    "Look up. The stars know the names of these stones.",
    "The grove dreams a little, at this hour. Mind your step.",
    "Even the moon looks sleepy. Stay as long as you like.",
  ],
};

/**
 * Villager phrase pools. The villagers are Neanderthal-styled
 * grove-dwellers — chibi, friendly, talkative in fragments. Their
 * lines are smaller, more domestic, more about *living* in the grove
 * than about the player.
 *
 * Wave 13 will gate spawning these on `grove.state === 'claimed'`;
 * for RC they spawn on every grove. (See `dialogueSystem.ts` and
 * `GrovePopulator.ts` for the gate marker.)
 */
export const VILLAGER_PHRASES: Readonly<Record<string, readonly string[]>> = {
  // The default pool. Sampled on every interact unless a more specific
  // tag (time-of-day, biome) overrides.
  general: [
    "Have you seen the deer near the meadow? Big eyes. Soft.",
    "I love how the breeze sounds here. Like the grove is humming.",
    "The river up north tastes a little of moss. I like it that way.",
    "My garden patch is doing better than I am, lately. Worth it.",
    "I named one of the bees. I will not tell you which.",
    "The old elder says the spirit blooms count us when we sleep. I believe her.",
    "Some days I just sit. The grove sits with me.",
    "There is a stone near the western fence that holds heat well. Good for resting on.",
    "I traded a basket for a song last week. Best deal I ever made.",
    "The wind smelled different today. Pine, maybe. Far off pine.",
    "I keep meaning to start a journal. The grove keeps distracting me.",
    "Shh — listen. The grass talks if you let it.",
  ],

  // Time-of-day flavour for villagers. Same 4-bucket scheme as Spirit.
  "time-of-day-morning": [
    "Morning, Gardener. The kettle is warm if you want some.",
    "Up early, are you? The bees beat us both.",
    "First thing I do every morning is check the spirit blooms. Hello, friends.",
    "Sun came up gentle today. I like that.",
    "Bread is rising. Smells good already.",
  ],
  "time-of-day-midday": [
    "Midday lull. The grove holds its breath until the heat passes.",
    "I am taking the slow walk. You are welcome to join.",
    "The shade under the heartwood tree is the best in the grove.",
    "Time for soup, I think. Time is always for soup.",
    "Even the bees rest at noon. So do I.",
  ],
  "time-of-day-evening": [
    "Evening already. Where did the day go?",
    "I light the lanterns at dusk. It is my favourite small task.",
    "The grove looks honey-coloured at this hour. I never get tired of it.",
    "Sit a moment. The day is done its loud part.",
    "Evening soup tastes better. Don't ask me why.",
  ],
  "time-of-day-night": [
    "The fireflies are out. The grove sparkles when they dance.",
    "Night here is softer than night anywhere else.",
    "I sleep with the window open. The grove sings me down.",
    "The stars make a different shape over the grove. I'm sure of it.",
    "Quiet hour. Best hour. Welcome.",
  ],
};

/**
 * Build a stable phrase id from speaker + tag + index. Persisted in
 * `dialogue_history.last_phrase_id`, so changes to the format are
 * save-breaking — leave the format alone.
 */
export function phraseId(
  speaker: "spirit" | "villager",
  tag: string,
  index: number,
): string {
  return `${speaker}:${tag}:${index}`;
}

/**
 * Strict tag set for callers that want type help. Not exhaustive —
 * `dialogueSystem.ts` is the only caller and it handles missing keys
 * by falling back to a default tag.
 */
export type SpiritTag = keyof typeof SPIRIT_PHRASES;
export type VillagerTag = keyof typeof VILLAGER_PHRASES;
