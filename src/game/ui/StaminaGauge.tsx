import { useGameStore } from "../stores/gameStore";

export const StaminaGauge = () => {
  const stamina = useGameStore((s) => s.stamina);
  const maxStamina = useGameStore((s) => s.maxStamina);

  const pct = Math.round((stamina / maxStamina) * 100);

  // Color gradient: green > 50%, yellow 25-50%, red < 25%
  let fillColor = "#4CAF50";
  if (pct < 25) {
    fillColor = "#F44336";
  } else if (pct < 50) {
    fillColor = "#FFC107";
  }

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
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${isLow ? "animate-pulse" : ""}`}
          style={{
            height: `${pct}%`,
            background: fillColor,
            borderRadius: "0 0 6px 6px",
          }}
        />
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-bold"
        style={{
          color: "rgba(245, 240, 227, 0.9)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {Math.round(stamina)}
      </span>
    </div>
  );
};
