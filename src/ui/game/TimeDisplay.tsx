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
    <div class="flex items-center gap-1.5">
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: "rgba(0,0,0,0.25)",
          color: "white",
        }}
      >
        <span>{getTimeIcon(time().hours)}</span>
        <span>{timeString()}</span>
      </div>

      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: `${seasonColors[time().season]}40`,
          color: "white",
          border: `1px solid ${seasonColors[time().season]}60`,
        }}
      >
        <span>{seasonIcons[time().season]}</span>
        <span class="hidden sm:inline capitalize">{time().season}</span>
        <span class="hidden xs:inline">D{time().day}</span>
      </div>
    </div>
  );
};

export const TimeDisplayCompact = (props: TimeDisplayProps) => {
  const time = () => props.time;
  return (
    <div
      class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
      style={{
        background: "rgba(0,0,0,0.25)",
        color: "white",
      }}
    >
      <span class="text-sm">{getTimeIcon(time().hours)}</span>
      <span class="text-sm">{seasonIcons[time().season]}</span>
    </div>
  );
};
