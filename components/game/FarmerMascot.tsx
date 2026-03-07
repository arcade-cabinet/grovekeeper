import { useEffect, useRef } from "react";
import { Animated as RNAnimated } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";

/**
 * Game-specific color constants used by the farmer mascot SVG.
 * These match the original BabylonJS project's COLORS from config.ts.
 */
const C = {
  forestGreen: "#2D5A27",
  barkBrown: "#5D4037",
  soilDark: "#3E2723",
  leafLight: "#81C784",
  autumnGold: "#FFB74D",
  earthRed: "#8D6E63",
} as const;

interface FarmerMascotProps {
  size?: number;
  animate?: boolean;
}

export function FarmerMascot({ size = 120, animate = true }: FarmerMascotProps) {
  const bounceAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;

    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(bounceAnim, {
          toValue: -5,
          duration: 1000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [animate, bounceAnim]);

  const content = (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Body - green overalls */}
      <Ellipse cx="50" cy="72" rx="22" ry="20" fill={C.forestGreen} />

      {/* Overall straps */}
      <Rect x="38" y="52" width="6" height="20" fill={C.forestGreen} />
      <Rect x="56" y="52" width="6" height="20" fill={C.forestGreen} />

      {/* Shirt underneath */}
      <Ellipse cx="50" cy="55" rx="15" ry="10" fill={C.autumnGold} />

      {/* Head */}
      <Circle cx="50" cy="35" r="20" fill="#FFCCBC" />

      {/* Rosy cheeks */}
      <Circle cx="38" cy="40" r="4" fill="#FFAB91" opacity="0.7" />
      <Circle cx="62" cy="40" r="4" fill="#FFAB91" opacity="0.7" />

      {/* Eyes */}
      <Circle cx="43" cy="33" r="3" fill={C.soilDark} />
      <Circle cx="57" cy="33" r="3" fill={C.soilDark} />
      <Circle cx="44" cy="32" r="1" fill="white" />
      <Circle cx="58" cy="32" r="1" fill="white" />

      {/* Happy smile */}
      <Path
        d="M43 42 Q50 48 57 42"
        stroke={C.soilDark}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Straw hat */}
      <Ellipse cx="50" cy="22" rx="25" ry="8" fill={C.autumnGold} />
      <Ellipse cx="50" cy="18" rx="15" ry="10" fill={C.autumnGold} />
      <Rect x="35" y="12" width="30" height="10" fill={C.autumnGold} />

      {/* Hat band */}
      <Rect x="35" y="18" width="30" height="3" fill={C.earthRed} />

      {/* Seedling in hat */}
      <Line x1="60" y1="8" x2="60" y2="15" stroke={C.forestGreen} strokeWidth="2" />
      <Ellipse cx="57" cy="6" rx="4" ry="3" fill={C.leafLight} />
      <Ellipse cx="63" cy="6" rx="4" ry="3" fill={C.leafLight} />

      {/* Arms */}
      <Ellipse cx="28" cy="65" rx="6" ry="8" fill="#FFCCBC" />
      <Ellipse cx="72" cy="65" rx="6" ry="8" fill="#FFCCBC" />

      {/* Shovel in hand */}
      <Rect x="75" y="55" width="3" height="25" fill={C.barkBrown} />
      <Rect x="72" y="78" width="9" height="8" rx="1" fill="#78909C" />

      {/* Boots */}
      <Ellipse cx="40" cy="92" rx="8" ry="5" fill={C.barkBrown} />
      <Ellipse cx="60" cy="92" rx="8" ry="5" fill={C.barkBrown} />

      {/* Mud on boots */}
      <Ellipse cx="38" cy="94" rx="4" ry="2" fill={C.soilDark} />
      <Ellipse cx="62" cy="94" rx="4" ry="2" fill={C.soilDark} />

      {/* Leaf patch on overalls */}
      <Ellipse cx="55" cy="75" rx="4" ry="3" fill={C.leafLight} />
    </Svg>
  );

  if (!animate) return content;

  return (
    <RNAnimated.View style={{ transform: [{ translateY: bounceAnim }] }}>
      {content}
    </RNAnimated.View>
  );
}
