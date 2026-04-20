import { createEffect, createSignal, onCleanup } from "solid-js";
import { COLORS } from "@/config/config";
import { useTrait } from "@/ecs/solid";
import { koota } from "@/koota";
import { totalXpForLevel, xpToNext } from "@/shared/utils/xp";
import { PlayerProgress } from "@/traits";

/** Tween a number toward a target, ease-out cubic, over durationMs. */
function useAnimatedNumber(
  target: () => number,
  durationMs = 400,
): () => number {
  const [value, setValue] = createSignal(target());
  let rafId: number | null = null;
  let fromValue = target();
  let toValue = target();
  let startTime = 0;

  createEffect(() => {
    const next = target();
    if (next === toValue) return;
    fromValue = value();
    toValue = next;
    startTime = performance.now();
    if (rafId != null) cancelAnimationFrame(rafId);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(fromValue + (toValue - fromValue) * eased);
      if (t < 1) rafId = requestAnimationFrame(tick);
      else rafId = null;
    };
    rafId = requestAnimationFrame(tick);
  });

  onCleanup(() => {
    if (rafId != null) cancelAnimationFrame(rafId);
  });

  return value;
}

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
  const targetPercent = () => Math.round(currentLevelProgress() * 100);
  const animatedPercent = useAnimatedNumber(targetPercent, 400);
  const percent = () => Math.round(animatedPercent());

  return (
    <div class="flex items-center justify-center pointer-events-auto">
      <div
        role="progressbar"
        aria-label={`Level ${level()} — XP progress`}
        aria-valuenow={percent()}
        aria-valuemin={0}
        aria-valuemax={100}
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
