/**
 * GroveVignette — shared still-life that backs landing, MainMenu,
 * and NewGameScreen. Mirrors the static SVG in index.html so the
 * live menu fades over the same image rather than hard-cutting.
 */
interface GroveVignetteProps {
  /** Slightly dim the vignette when used as the New Game backdrop. */
  dim?: boolean;
}

export const GroveVignette = (props: GroveVignetteProps) => {
  return (
    <div
      class="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{
        background:
          "radial-gradient(ellipse at 50% 65%, #0d2b22 0%, #07140f 70%, #030806 100%)",
        opacity: props.dim ? 0.7 : 1,
        transition: "opacity 600ms ease-out",
      }}
    >
      <svg
        class="absolute inset-0 w-full h-full"
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="grove-glow" cx="50%" cy="55%" r="40%">
            <stop offset="0%" stop-color="#fff7d6" stop-opacity="0.55" />
            <stop offset="40%" stop-color="#f5e1a4" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#f5e1a4" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="canopy-blossom" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stop-color="#f7d4d8" stop-opacity="0.92" />
            <stop offset="55%" stop-color="#cf6f7f" stop-opacity="0.7" />
            <stop offset="100%" stop-color="#3a1f29" stop-opacity="0.85" />
          </radialGradient>
          <linearGradient id="grove-trunk" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#3a2818" />
            <stop offset="100%" stop-color="#1c130b" />
          </linearGradient>
        </defs>
        <ellipse cx="400" cy="540" rx="320" ry="240" fill="url(#grove-glow)" />
        <path d="M0 760 Q200 740 400 750 T800 760 L800 1000 L0 1000 Z" fill="#020604" opacity="0.85" />
        <path d="M388 760 L380 600 Q394 570 408 600 L416 760 Z" fill="url(#grove-trunk)" />
        <path d="M390 620 Q360 590 340 555" stroke="#1c130b" stroke-width="6" stroke-linecap="round" fill="none" />
        <path d="M410 620 Q438 588 462 552" stroke="#1c130b" stroke-width="6" stroke-linecap="round" fill="none" />
        <ellipse cx="400" cy="500" rx="220" ry="170" fill="url(#canopy-blossom)" />
        <ellipse cx="320" cy="510" rx="120" ry="100" fill="url(#canopy-blossom)" opacity="0.85" />
        <ellipse cx="488" cy="510" rx="120" ry="100" fill="url(#canopy-blossom)" opacity="0.85" />
        <circle cx="360" cy="780" r="3" fill="#cf6f7f" opacity="0.55" />
        <circle cx="440" cy="788" r="2.5" fill="#f7d4d8" opacity="0.6" />
        <circle cx="300" cy="800" r="2" fill="#cf6f7f" opacity="0.45" />
        <circle cx="510" cy="795" r="2" fill="#f7d4d8" opacity="0.55" />
      </svg>
    </div>
  );
};
