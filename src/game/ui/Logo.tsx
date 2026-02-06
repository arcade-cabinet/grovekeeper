import { COLORS } from "../constants/config";

export const Logo = ({ size = 200 }: { size?: number }) => {
  const scale = size / 200;

  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tree trunk */}
      <rect
        x="90"
        y="60"
        width="20"
        height="40"
        rx="2"
        fill={COLORS.barkBrown}
      />

      {/* Tree canopy layers */}
      <ellipse cx="100" cy="50" rx="45" ry="30" fill={COLORS.forestGreen} />
      <ellipse cx="100" cy="40" rx="35" ry="25" fill={COLORS.leafLight} />
      <ellipse cx="100" cy="35" rx="25" ry="18" fill={COLORS.forestGreen} />

      {/* Roots */}
      <path
        d="M85 100 Q80 105 70 105"
        stroke={COLORS.barkBrown}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M115 100 Q120 105 130 105"
        stroke={COLORS.barkBrown}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Ground line */}
      <path
        d="M30 100 Q100 95 170 100"
        stroke={COLORS.soilDark}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Text */}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="bold"
        fontSize={14 * scale}
        fill={COLORS.soilDark}
      >
        GROVE KEEPER
      </text>
    </svg>
  );
};
