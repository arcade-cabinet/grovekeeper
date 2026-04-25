/**
 * FarmerMascot — placeholder stub.
 *
 * The original cozy farmer SVG was deleted in the BabylonJS purge
 * (commit 8142d0d). The journey wave will replace this with the
 * Gardener-themed mascot per the RC redesign brand identity. For now
 * this is a tiny no-op so MainMenu / PauseMenu still typecheck and
 * boot.
 */

interface FarmerMascotProps {
  size?: number;
  animate?: boolean;
}

export const FarmerMascot = (_props: FarmerMascotProps) => {
  // TODO(wave-journey): real Gardener mascot SVG. See
  // docs/superpowers/specs/2026-04-24-grovekeeper-rc-redesign-design.md
  // §"The journey".
  return null;
};
