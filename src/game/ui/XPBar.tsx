import { COLORS } from "../constants/config";
import { totalXpForLevel, useGameStore, xpToNext } from "../stores/gameStore";

export const XPBar = () => {
  const xp = useGameStore((s) => s.xp);
  const level = useGameStore((s) => s.level);

  const xpForCurrentLevel = totalXpForLevel(level);
  const xpNeeded = xpToNext(level);
  const currentLevelProgress =
    xpNeeded > 0 ? Math.min((xp - xpForCurrentLevel) / xpNeeded, 1) : 0;
  const percent = Math.round(currentLevelProgress * 100);

  return (
    <div className="flex items-center justify-center pointer-events-auto">
      <div
        className="relative flex items-center rounded-full overflow-hidden"
        style={{
          height: 28,
          width: 180,
          background: "rgba(245, 240, 227, 0.90)",
          border: `2px solid #5D4037`,
        }}
      >
        {/* Level badge */}
        <div
          className="relative z-10 flex items-center justify-center shrink-0 rounded-full"
          style={{
            width: 24,
            height: 24,
            marginLeft: 1,
            background: COLORS.forestGreen,
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {level}
        </div>

        {/* Fill track area */}
        <div className="relative flex-1 h-full">
          {/* Gold fill bar */}
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${percent}%`,
              background: COLORS.autumnGold,
              transition: "width 0.4s ease-out",
            }}
          />

          {/* Percentage text */}
          <span
            className="relative z-10 flex items-center justify-end h-full pr-2"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.soilDark,
            }}
          >
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
};
