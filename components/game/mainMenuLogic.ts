/**
 * Pure logic for the MainMenu component (Spec §26).
 *
 * Extracted to a plain .ts file so it can be unit-tested without pulling in
 * the React Native JSX runtime chain (which crashes in Jest).
 */

/** Returns true when the player has an existing save worth continuing. */
export function hasSave(treesPlanted: number): boolean {
  return treesPlanted > 0;
}

/** Returns the label for the primary CTA button. */
export function primaryButtonLabel(treesPlanted: number): string {
  return hasSave(treesPlanted) ? "Continue Grove" : "Start Growing";
}

/**
 * Returns whether the "New Grove" secondary button should be visible.
 * It's only shown alongside "Continue Grove" when a save exists.
 */
export function showNewGroveButton(treesPlanted: number): boolean {
  return hasSave(treesPlanted);
}

/** Returns the formatted tree count summary line. */
export function treeSummaryText(treesPlanted: number): string {
  return `${treesPlanted} ${treesPlanted === 1 ? "tree" : "trees"} planted so far`;
}
