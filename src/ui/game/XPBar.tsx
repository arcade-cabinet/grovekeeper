import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { totalXpForLevel, xpToNext } from "@/shared/utils/xp";
import { PlayerProgress } from "@/traits";

export const XPBar = () => {
  const progress = useTrait(koota, PlayerProgress);
  const xp = () => progress()?.xp ?? 0;
  const level = () => progress()?.level ?? 1;

  const xpForCurrentLevel = () => totalXpForLevel(level());
  const xpNeeded = () => xpToNext(level());
  const currentLevelProgress = () => {
    const needed = xpNeeded();
    return needed > 0 ? Math.min((xp() - xpForCurrentLevel()) / needed, 1) : 0;
  };
  const percent = () => Math.round(currentLevelProgress() * 100);

  return (
    <div class="flex items-center justify-center pointer-events-auto">
      <div
        class="relative flex items-center rounded-full overflow-hidden"
        style={{
          height: "28px",
          width: "180px",
          background: "rgba(245, 240, 227, 0.90)",
          border: "2px solid #5D4037",
        }}
      >
        <div
          class="relative z-10 flex items-center justify-center shrink-0 rounded-full"
          style={{
            width: "24px",
            height: "24px",
            "margin-left": "1px",
            background: COLORS.forestGreen,
            color: "white",
            "font-size": "11px",
            "font-weight": 700,
            "line-height": 1,
          }}
        >
          {level()}
        </div>

        <div class="relative flex-1 h-full">
          <div
            class="absolute inset-y-0 left-0"
            style={{
              width: `${percent()}%`,
              background: COLORS.autumnGold,
              transition: "width 0.4s ease-out",
            }}
          />

          <span
            class="relative z-10 flex items-center justify-end h-full pr-2"
            style={{
              "font-size": "11px",
              "font-weight": 700,
              color: COLORS.soilDark,
            }}
          >
            {percent()}%
          </span>
        </div>
      </div>
    </div>
  );
};
