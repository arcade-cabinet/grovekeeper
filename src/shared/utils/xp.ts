/**
 * Spec §21 XP formula:
 * xpToNext(level) = 100 + (level - 2) × 50 + floor((level - 1) / 5) × 200
 * Level 1 needs 100 XP (edge case: (1-2)*50 = -50, clamped by the 100 base).
 */
export function xpToNext(level: number): number {
  if (level < 1) return 100;
  return (
    100 + Math.max(0, (level - 2) * 50) + Math.floor((level - 1) / 5) * 200
  );
}

/**
 * Total XP needed to reach targetLevel from level 1.
 */
export function totalXpForLevel(targetLevel: number): number {
  let total = 0;
  for (let lv = 1; lv < targetLevel; lv++) {
    total += xpToNext(lv);
  }
  return total;
}

/**
 * Given total XP, determine the current level.
 */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return level;
}
