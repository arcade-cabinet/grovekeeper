/**
 * TutorialOverlay -- RETIRED.
 *
 * The 11-step linear overlay tutorial has been replaced by organic
 * quest-driven onboarding via the "elder-awakening" quest chain.
 * See game/quests/data/questChains.json and game/systems/tutorial.ts.
 *
 * This component renders nothing. It is kept as a stub so that existing
 * imports in GameUI/index.tsx compile without modification.
 *
 * Spec §25.1 — onboarding is now handled by the Elder Awakening starting
 * quest chain, not a linear overlay tutorial.
 */

// TutorialTargetRect is kept for backward-compatible prop types in GameUI.
export interface TutorialTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TutorialOverlayProps {
  targetRect: TutorialTargetRect | null;
  label?: string | null;
}

/** Retired overlay — renders nothing. */
export function TutorialOverlay(_props: TutorialOverlayProps): null {
  return null;
}
