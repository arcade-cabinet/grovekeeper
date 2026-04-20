import spiritsData from "./spirits.json";

export interface SpiritDialogue {
  greeting: string;
  firstMeet: string;
  subsequent: string[];
}

export interface SpiritReward {
  xp: number;
  cosmeticId: string;
  lore: string;
}

export interface SpiritAppearance {
  orbColorHex: string;
  haloColorHex: string;
  scale: number;
}

export interface Spirit {
  id: string;
  name: string;
  aspect: string;
  biome: string;
  unlockLevel: number;
  dialogue: SpiritDialogue;
  reward: SpiritReward;
  appearance: SpiritAppearance;
}

/**
 * Runtime shape check for one spirit record. Throws with a
 * location-hinting message if the JSON has drifted from the interface.
 * Cheap (one per spirit at load, 8 total), worth it to fail fast.
 */
function validateSpirit(raw: unknown, path: string): Spirit {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`spirits.json: ${path} is not an object`);
  }
  const r = raw as Record<string, unknown>;
  const requireType = (key: string, expected: string): void => {
    const actual = typeof r[key];
    if (actual !== expected) {
      throw new Error(
        `spirits.json: ${path}.${key} must be ${expected}, got ${actual}`,
      );
    }
  };
  requireType("id", "string");
  requireType("name", "string");
  requireType("aspect", "string");
  requireType("biome", "string");
  requireType("unlockLevel", "number");

  if (typeof r.dialogue !== "object" || r.dialogue === null) {
    throw new Error(`spirits.json: ${path}.dialogue must be an object`);
  }
  const d = r.dialogue as Record<string, unknown>;
  if (typeof d.greeting !== "string") {
    throw new Error(`spirits.json: ${path}.dialogue.greeting must be a string`);
  }
  if (typeof d.firstMeet !== "string") {
    throw new Error(
      `spirits.json: ${path}.dialogue.firstMeet must be a string`,
    );
  }
  if (!Array.isArray(d.subsequent) || d.subsequent.length === 0) {
    throw new Error(
      `spirits.json: ${path}.dialogue.subsequent must be a non-empty array`,
    );
  }

  if (typeof r.reward !== "object" || r.reward === null) {
    throw new Error(`spirits.json: ${path}.reward must be an object`);
  }
  const rw = r.reward as Record<string, unknown>;
  if (typeof rw.xp !== "number") {
    throw new Error(`spirits.json: ${path}.reward.xp must be a number`);
  }
  if (typeof rw.cosmeticId !== "string") {
    throw new Error(`spirits.json: ${path}.reward.cosmeticId must be a string`);
  }
  if (typeof rw.lore !== "string") {
    throw new Error(`spirits.json: ${path}.reward.lore must be a string`);
  }

  if (typeof r.appearance !== "object" || r.appearance === null) {
    throw new Error(`spirits.json: ${path}.appearance must be an object`);
  }
  const ap = r.appearance as Record<string, unknown>;
  if (typeof ap.orbColorHex !== "string") {
    throw new Error(
      `spirits.json: ${path}.appearance.orbColorHex must be a string`,
    );
  }
  if (typeof ap.haloColorHex !== "string") {
    throw new Error(
      `spirits.json: ${path}.appearance.haloColorHex must be a string`,
    );
  }
  if (typeof ap.scale !== "number") {
    throw new Error(`spirits.json: ${path}.appearance.scale must be a number`);
  }

  return r as unknown as Spirit;
}

function validateSpiritList(raw: unknown): Spirit[] {
  if (!Array.isArray(raw)) {
    throw new Error("spirits.json: spirits must be an array");
  }
  return raw.map((item, i) => validateSpirit(item, `spirits[${i}]`));
}

export const SPIRITS: Spirit[] = validateSpiritList(spiritsData.spirits);

export function getSpiritById(id: string): Spirit | undefined {
  return SPIRITS.find((s) => s.id === id);
}

// Exported for tests; safe to call at runtime but unlikely to be useful.
export const __testing = { validateSpirit, validateSpiritList };
