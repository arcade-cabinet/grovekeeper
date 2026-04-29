import { Show } from "solid-js";
import { COLORS } from "@/config/config";
import { useEntityTrait, useQueryFirst } from "@/ecs/solid";
import { FarmerState, IsPlayer } from "@/traits";

const VitalBar = (props: {
  label: string;
  value: number;
  max: number;
  pct: number;
  fillColor: string;
  isLow: boolean;
}) => (
  <div class="flex flex-col items-center gap-1" style={{ width: "28px" }}>
    <div
      role="progressbar"
      aria-label={props.label}
      aria-valuenow={props.pct}
      aria-valuemin={0}
      aria-valuemax={100}
      class="relative w-full rounded-lg overflow-hidden"
      style={{
        height: "100px",
        background: `${COLORS.parchment}e6`,
        border: `2px solid ${COLORS.barkBrown}`,
        "box-shadow": "0 4px 12px rgba(26, 58, 42, 0.15)",
      }}
    >
      <div
        class={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${props.isLow ? "motion-safe:animate-pulse" : ""}`}
        style={{
          height: `${props.pct}%`,
          background: props.fillColor,
          "border-radius": "0 0 6px 6px",
        }}
      />
    </div>
    <span
      class="text-xs font-bold whitespace-nowrap"
      style={{
        color: COLORS.parchment,
        "text-shadow": `0 1px 2px ${COLORS.soilDark}`,
      }}
    >
      {Math.round(props.value)}/{props.max}
    </span>
  </div>
);

function vitalColor(
  pct: number,
  low: string,
  mid: string,
  high: string,
): string {
  if (pct < 25) return low;
  if (pct < 50) return mid;
  return high;
}

export const StaminaGauge = () => {
  const player = useQueryFirst(IsPlayer, FarmerState);
  const fs = useEntityTrait(player, FarmerState);

  const stamina = () => fs()?.stamina ?? 100;
  const maxStamina = () => fs()?.maxStamina ?? 100;
  const staminaPct = () =>
    maxStamina() > 0 ? Math.round((stamina() / maxStamina()) * 100) : 0;
  const staminaColor = () =>
    vitalColor(staminaPct(), "#E76F51", "#F4A261", "#52B788");

  const hp = () => fs()?.hp ?? 100;
  const maxHp = () => fs()?.maxHp ?? 100;
  const hpPct = () => (maxHp() > 0 ? Math.round((hp() / maxHp()) * 100) : 0);
  const hpColor = () => vitalColor(hpPct(), "#C62828", "#E53935", "#EF9A9A");

  return (
    <div class="flex items-end gap-1.5">
      <VitalBar
        label="HP"
        value={hp()}
        max={maxHp()}
        pct={hpPct()}
        fillColor={hpColor()}
        isLow={hpPct() < 25}
      />
      <VitalBar
        label="Stamina"
        value={stamina()}
        max={maxStamina()}
        pct={staminaPct()}
        fillColor={staminaColor()}
        isLow={staminaPct() < 25}
      />
    </div>
  );
};

/**
 * Full-viewport vignette that pulses red-orange when stamina drops below 25%.
 * Non-interactive (pointer-events: none); suppressed under reduced-motion
 * via CSS `motion-safe:*` utility (the pulse animation only runs when safe).
 */
export const LowStaminaOverlay = () => {
  const player = useQueryFirst(IsPlayer, FarmerState);
  const fs = useEntityTrait(player, FarmerState);
  const pct = () => {
    const s = fs();
    if (!s || s.maxStamina <= 0) return 100;
    return (s.stamina / s.maxStamina) * 100;
  };
  const isLow = () => pct() < 25;

  return (
    <Show when={isLow()}>
      <div
        class="fixed inset-0 motion-safe:animate-pulse"
        style={{
          "pointer-events": "none",
          "z-index": 60,
          // Radial vignette: transparent center, red-orange ring.
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(231, 111, 81, 0.35) 100%)",
        }}
        aria-hidden="true"
      />
    </Show>
  );
};
