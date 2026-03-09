import Svg, { Circle, Ellipse, Line, Path, Text as SvgText } from "react-native-svg";

/**
 * Game-specific color constants used by the logo SVG.
 * These match the original BabylonJS project's COLORS from config.ts.
 */
const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
} as const;

interface LogoProps {
  size?: number;
}

export function Logo({ size = 200 }: LogoProps) {
  const scale = size / 200;

  return (
    <Svg
      width={size}
      height={size * 0.65}
      viewBox="0 0 200 130"
      fill="none"
      accessibilityLabel="Grovekeeper logo"
    >
      {/* Tree trunk with taper */}
      <Path
        d="M95 65 L92 98 Q92 100 94 100 L106 100 Q108 100 108 98 L105 65 Z"
        fill={C.barkBrown}
      />
      {/* Bark detail lines */}
      <Line x1="98" y1="70" x2="97" y2="95" stroke={C.soilDark} strokeWidth="0.5" opacity="0.4" />
      <Line x1="102" y1="72" x2="103" y2="92" stroke={C.soilDark} strokeWidth="0.5" opacity="0.4" />

      {/* Canopy layers -- bottom to top for natural overlap */}
      <Ellipse cx="100" cy="52" rx="42" ry="28" fill={C.forestGreen} />
      <Ellipse cx="85" cy="48" rx="28" ry="22" fill={C.leafLight} opacity="0.85" />
      <Ellipse cx="115" cy="46" rx="26" ry="20" fill={C.leafLight} opacity="0.75" />
      <Ellipse cx="100" cy="38" rx="30" ry="22" fill={C.forestGreen} />
      <Ellipse cx="100" cy="30" rx="20" ry="16" fill={C.leafLight} opacity="0.9" />

      {/* Highlight spots on canopy */}
      <Circle cx="90" cy="35" r="4" fill="white" opacity="0.15" />
      <Circle cx="108" cy="28" r="3" fill="white" opacity="0.12" />

      {/* Small leaves falling */}
      <Ellipse
        cx="60"
        cy="70"
        rx="3"
        ry="1.5"
        fill={C.leafLight}
        opacity="0.5"
        rotation={-30}
        origin="60, 70"
      />
      <Ellipse
        cx="140"
        cy="60"
        rx="2.5"
        ry="1.2"
        fill={C.leafLight}
        opacity="0.4"
        rotation={25}
        origin="140, 60"
      />

      {/* Roots */}
      <Path
        d="M92 100 Q85 106 72 108"
        stroke={C.barkBrown}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M108 100 Q115 106 128 108"
        stroke={C.barkBrown}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M95 100 Q90 104 82 104"
        stroke={C.barkBrown}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <Path
        d="M105 100 Q110 104 118 104"
        stroke={C.barkBrown}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Ground line */}
      <Path
        d="M25 108 Q65 104 100 105 Q135 106 175 108"
        stroke={C.soilDark}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Title text */}
      <SvgText
        x="100"
        y="125"
        textAnchor="middle"
        fontFamily="CinzelDecorative"
        fontWeight="600"
        fontSize={16 * scale}
        fill={C.soilDark}
        letterSpacing={1}
      >
        Grovekeeper
      </SvgText>
    </Svg>
  );
}
