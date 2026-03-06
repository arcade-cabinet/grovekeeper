import { COLORS } from "../constants/config";

export const Logo = ({ size = 200 }: { size?: number }) => {
  const scale = size / 200;

  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 200 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Grovekeeper logo"
    >
      {/* Tree trunk with taper */}
      <path
        d="M95 65 L92 98 Q92 100 94 100 L106 100 Q108 100 108 98 L105 65 Z"
        fill={COLORS.barkBrown}
      />
      {/* Bark detail lines */}
      <line x1="98" y1="70" x2="97" y2="95" stroke={COLORS.soilDark} strokeWidth="0.5" opacity="0.4" />
      <line x1="102" y1="72" x2="103" y2="92" stroke={COLORS.soilDark} strokeWidth="0.5" opacity="0.4" />

      {/* Canopy layers — bottom to top for natural overlap */}
      <ellipse cx="100" cy="52" rx="42" ry="28" fill={COLORS.forestGreen} />
      <ellipse cx="85" cy="48" rx="28" ry="22" fill={COLORS.leafLight} opacity="0.85" />
      <ellipse cx="115" cy="46" rx="26" ry="20" fill={COLORS.leafLight} opacity="0.75" />
      <ellipse cx="100" cy="38" rx="30" ry="22" fill={COLORS.forestGreen} />
      <ellipse cx="100" cy="30" rx="20" ry="16" fill={COLORS.leafLight} opacity="0.9" />

      {/* Highlight spots on canopy */}
      <circle cx="90" cy="35" r="4" fill="white" opacity="0.15" />
      <circle cx="108" cy="28" r="3" fill="white" opacity="0.12" />

      {/* Small leaves falling */}
      <ellipse cx="60" cy="70" rx="3" ry="1.5" fill={COLORS.leafLight} opacity="0.5" transform="rotate(-30 60 70)" />
      <ellipse cx="140" cy="60" rx="2.5" ry="1.2" fill={COLORS.leafLight} opacity="0.4" transform="rotate(25 140 60)" />

      {/* Roots */}
      <path
        d="M92 100 Q85 106 72 108"
        stroke={COLORS.barkBrown}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M108 100 Q115 106 128 108"
        stroke={COLORS.barkBrown}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M95 100 Q90 104 82 104"
        stroke={COLORS.barkBrown}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M105 100 Q110 104 118 104"
        stroke={COLORS.barkBrown}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Ground line */}
      <path
        d="M25 108 Q65 104 100 105 Q135 106 175 108"
        stroke={COLORS.soilDark}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Title text */}
      <text
        x="100"
        y="125"
        textAnchor="middle"
        fontFamily="Fredoka, var(--font-heading), sans-serif"
        fontWeight="600"
        fontSize={16 * scale}
        fill={COLORS.soilDark}
        letterSpacing="1"
      >
        Grovekeeper
      </text>
    </svg>
  );
};
