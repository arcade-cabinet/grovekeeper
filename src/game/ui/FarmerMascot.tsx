import { COLORS } from "../constants/config";

interface FarmerMascotProps {
  size?: number;
  animate?: boolean;
}

export const FarmerMascot = ({
  size = 120,
  animate = true,
}: FarmerMascotProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={animate ? { animation: "bounce 2s ease-in-out infinite" } : {}}
    >
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}
      </style>

      {/* Body - green overalls */}
      <ellipse cx="50" cy="72" rx="22" ry="20" fill={COLORS.forestGreen} />

      {/* Overall straps */}
      <rect x="38" y="52" width="6" height="20" fill={COLORS.forestGreen} />
      <rect x="56" y="52" width="6" height="20" fill={COLORS.forestGreen} />

      {/* Shirt underneath */}
      <ellipse cx="50" cy="55" rx="15" ry="10" fill={COLORS.autumnGold} />

      {/* Head */}
      <circle cx="50" cy="35" r="20" fill="#FFCCBC" />

      {/* Rosy cheeks */}
      <circle cx="38" cy="40" r="4" fill="#FFAB91" opacity="0.7" />
      <circle cx="62" cy="40" r="4" fill="#FFAB91" opacity="0.7" />

      {/* Eyes */}
      <circle cx="43" cy="33" r="3" fill={COLORS.soilDark} />
      <circle cx="57" cy="33" r="3" fill={COLORS.soilDark} />
      <circle cx="44" cy="32" r="1" fill="white" />
      <circle cx="58" cy="32" r="1" fill="white" />

      {/* Happy smile */}
      <path
        d="M43 42 Q50 48 57 42"
        stroke={COLORS.soilDark}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Straw hat */}
      <ellipse cx="50" cy="22" rx="25" ry="8" fill={COLORS.autumnGold} />
      <ellipse cx="50" cy="18" rx="15" ry="10" fill={COLORS.autumnGold} />
      <rect x="35" y="12" width="30" height="10" fill={COLORS.autumnGold} />

      {/* Hat band */}
      <rect x="35" y="18" width="30" height="3" fill={COLORS.earthRed} />

      {/* Seedling in hat */}
      <line
        x1="60"
        y1="8"
        x2="60"
        y2="15"
        stroke={COLORS.forestGreen}
        strokeWidth="2"
      />
      <ellipse cx="57" cy="6" rx="4" ry="3" fill={COLORS.leafLight} />
      <ellipse cx="63" cy="6" rx="4" ry="3" fill={COLORS.leafLight} />

      {/* Arms */}
      <ellipse cx="28" cy="65" rx="6" ry="8" fill="#FFCCBC" />
      <ellipse cx="72" cy="65" rx="6" ry="8" fill="#FFCCBC" />

      {/* Shovel in hand */}
      <rect x="75" y="55" width="3" height="25" fill={COLORS.barkBrown} />
      <rect x="72" y="78" width="9" height="8" rx="1" fill="#78909C" />

      {/* Boots */}
      <ellipse cx="40" cy="92" rx="8" ry="5" fill={COLORS.barkBrown} />
      <ellipse cx="60" cy="92" rx="8" ry="5" fill={COLORS.barkBrown} />

      {/* Mud on boots */}
      <ellipse cx="38" cy="94" rx="4" ry="2" fill={COLORS.soilDark} />
      <ellipse cx="62" cy="94" rx="4" ry="2" fill={COLORS.soilDark} />

      {/* Leaf patch on overalls */}
      <ellipse cx="55" cy="75" rx="4" ry="3" fill={COLORS.leafLight} />
    </svg>
  );
};
