import { COLORS } from "@/config/config";
import type { GameTime, Season } from "@/systems/time";

interface TimeDisplayProps {
  time: GameTime;
}

const seasonIcons: Record<Season, string> = {
  spring: "🌸",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
};

const seasonColors: Record<Season, string> = {
  spring: "#90EE90",
  summer: "#FFD700",
  autumn: "#FF8C00",
  winter: "#87CEEB",
};

const getTimeIcon = (hours: number): string => {
  if (hours >= 5 && hours < 7) return "🌅";
  if (hours >= 7 && hours < 12) return "🌤️";
  if (hours >= 12 && hours < 17) return "☀️";
  if (hours >= 17 && hours < 20) return "🌇";
  if (hours >= 20 && hours < 22) return "🌙";
  return "🌑";
};

export const TimeDisplay = (props: TimeDisplayProps) => {
  const time = () => props.time;
  const timeString = () => {
    const t = time();
    return `${t.hours.toString().padStart(2, "0")}:${t.minutes.toString().padStart(2, "0")}`;
  };

  return (
    <div
      class="flex items-center gap-1.5"
      role="region"
      aria-label="Time and season"
    >
      <div
        role="group"
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        aria-label={`Time: ${timeString()}`}
        style={{
          background: `${COLORS.parchment}e6`,
          border: `1px solid ${COLORS.barkBrown}`,
          color: COLORS.soilDark,
        }}
      >
        <span aria-hidden="true">{getTimeIcon(time().hours)}</span>
        <span aria-hidden="true">{timeString()}</span>
      </div>

      <div
        role="group"
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        aria-label={`Season: ${time().season}, day ${time().day}`}
        style={{
          background: `${seasonColors[time().season]}66`,
          color: COLORS.soilDark,
          border: `1px solid ${COLORS.barkBrown}`,
        }}
      >
        <span aria-hidden="true">{seasonIcons[time().season]}</span>
        <span aria-hidden="true" class="hidden sm:inline capitalize">
          {time().season}
        </span>
        <span aria-hidden="true" class="hidden xs:inline">
          D{time().day}
        </span>
      </div>
    </div>
  );
};

export const TimeDisplayCompact = (props: TimeDisplayProps) => {
  const time = () => props.time;
  return (
    <div
      role="group"
      class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
      aria-label={`${time().season}, day ${time().day}`}
      style={{
        background: `${COLORS.parchment}e6`,
        border: `1px solid ${COLORS.barkBrown}`,
        color: COLORS.soilDark,
      }}
    >
      <span class="text-sm" aria-hidden="true">
        {getTimeIcon(time().hours)}
      </span>
      <span class="text-sm" aria-hidden="true">
        {seasonIcons[time().season]}
      </span>
    </div>
  );
};
