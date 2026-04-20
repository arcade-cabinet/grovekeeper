import { useQueryFirst, useTrait } from "@/ecs/solid";
import { FarmerState, IsPlayer } from "@/traits";

export const StaminaGauge = () => {
  const player = useQueryFirst(IsPlayer, FarmerState);
  const fs = useTrait(player(), FarmerState);
  const stamina = () => fs()?.stamina ?? 100;
  const maxStamina = () => fs()?.maxStamina ?? 100;

  const pct = () =>
    maxStamina() > 0 ? Math.round((stamina() / maxStamina()) * 100) : 0;

  const fillColor = () => {
    const p = pct();
    return p < 25 ? "#E76F51" : p < 50 ? "#F4A261" : "#52B788";
  };
  const isLow = () => pct() < 25;

  return (
    <div class="flex flex-col items-center gap-1" style={{ width: "28px" }}>
      <div
        class="relative w-full rounded-lg overflow-hidden"
        style={{
          height: "100px",
          background: "rgba(245, 240, 227, 0.90)",
          border: "2px solid #5D4037",
          "box-shadow": "0 4px 12px rgba(26, 58, 42, 0.15)",
        }}
      >
        <div
          class={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${isLow() ? "motion-safe:animate-pulse" : ""}`}
          style={{
            height: `${pct()}%`,
            background: fillColor(),
            "border-radius": "0 0 6px 6px",
          }}
        />
      </div>

      <span
        class="text-xs font-bold whitespace-nowrap"
        style={{
          color: "rgba(245, 240, 227, 0.9)",
          "text-shadow": "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {Math.round(stamina())}/{maxStamina()}
      </span>
    </div>
  );
};
