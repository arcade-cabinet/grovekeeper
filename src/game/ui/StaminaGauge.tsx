import { useGameStore } from "../stores/gameStore";

/**
 * Vertical stamina bar positioned on the right side of the screen.
 *
 * Fills bottom-to-top. Color shifts from green (full) through orange (50%)
 * to red (25%). Pulses when stamina is critically low (<25%).
 * Shows "current/max" text below the bar.
 */
export const StaminaGauge = () => {
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);

  const pct = maxStamina > 0 ? Math.round((stamina / maxStamina) * 100) : 0;

  // Color gradient: green > 50%, orange 25-50%, red < 25%
  const fillColor = pct < 25 ? "#E76F51" : pct < 50 ? "#F4A261" : "#52B788";
  const isLow = pct < 25;

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 28 }}>
      {/* Vertical bar container */}
      <div
        className="relative w-full rounded-lg overflow-hidden"
        style={{
          height: 100,
          background: "rgba(245, 240, 227, 0.90)",
          border: "2px solid #5D4037",
          boxShadow: "0 4px 12px rgba(26, 58, 42, 0.15)",
        }}
      >
        {/* Fill grows from bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${isLow ? "motion-safe:animate-pulse" : ""}`}
          style={{
            height: `${pct}%`,
            background: fillColor,
            borderRadius: "0 0 6px 6px",
          }}
        />
      </div>

      {/* Label: current/max */}
      <span
        className="text-xs font-bold whitespace-nowrap"
        style={{
          color: "rgba(245, 240, 227, 0.9)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {Math.round(stamina)}/{maxStamina}
      </span>
    </div>
  );
};
