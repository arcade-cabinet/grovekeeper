
import type { GameTime, Season } from "../systems/time";

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
  if (hours >= 5 && hours < 7) return "🌅"; // Dawn
  if (hours >= 7 && hours < 12) return "🌤️"; // Morning
  if (hours >= 12 && hours < 17) return "☀️"; // Day
  if (hours >= 17 && hours < 20) return "🌇"; // Dusk
  if (hours >= 20 && hours < 22) return "🌙"; // Evening
  return "🌑"; // Night
};

export const TimeDisplay = ({ time }: TimeDisplayProps) => {
  const { hours, minutes, day, season } = time;
  
  // Format time as HH:MM
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  
  return (
    <div className="flex items-center gap-1.5">
      {/* Time of day */}
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: "rgba(0,0,0,0.25)",
          color: "white",
        }}
      >
        <span>{getTimeIcon(hours)}</span>
        <span>{timeString}</span>
      </div>
      
      {/* Day and Season */}
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          background: `${seasonColors[season]}40`,
          color: "white",
          border: `1px solid ${seasonColors[season]}60`,
        }}
      >
        <span>{seasonIcons[season]}</span>
        <span className="hidden sm:inline capitalize">{season}</span>
        <span className="hidden xs:inline">D{day}</span>
      </div>
    </div>
  );
};

// Compact version for very small screens
export const TimeDisplayCompact = ({ time }: TimeDisplayProps) => {
  const { hours, season } = time;
  
  return (
    <div
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
      style={{
        background: "rgba(0,0,0,0.25)",
        color: "white",
      }}
    >
      <span className="text-sm">{getTimeIcon(hours)}</span>
      <span className="text-sm">{seasonIcons[season]}</span>
    </div>
  );
};
