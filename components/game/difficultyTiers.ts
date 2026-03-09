/**
 * Difficulty tier data for NewGameModal (Spec S3, S37).
 *
 * Extracted to keep NewGameModal.tsx under 300 lines.
 */
import { ACCENT } from "@/components/ui/tokens";
import type { DifficultyTier } from "./TierCard.tsx";

export const TIERS: DifficultyTier[] = [
  {
    id: "seedling",
    name: "Seedling",
    icon: "\u{1F331}",
    hearts: 7,
    tagline: "Gentle survival",
    color: ACCENT.sap,
    permadeathForced: "off",
  },
  {
    id: "sapling",
    name: "Sapling",
    icon: "\u{1F33F}",
    hearts: 5,
    tagline: "The intended experience",
    color: ACCENT.frost,
    permadeathForced: "optional",
  },
  {
    id: "hardwood",
    name: "Hardwood",
    icon: "\u{1F525}",
    hearts: 4,
    tagline: "Nature fights back",
    color: ACCENT.amber,
    permadeathForced: "optional",
  },
  {
    id: "ironwood",
    name: "Ironwood",
    icon: "\u{1F480}",
    hearts: 3,
    tagline: "One bad winter ends it all",
    color: ACCENT.ember,
    permadeathForced: "on",
  },
];
