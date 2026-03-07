import { View } from "react-native";
import { Text } from "@/components/ui/text";

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface GameTime {
  hours: number;
  minutes: number;
  day: number;
  season: Season;
}

export interface TimeDisplayProps {
  time: GameTime;
}

const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

const SEASON_COLORS: Record<Season, string> = {
  spring: "bg-season-spring/30 border-season-spring/50",
  summer: "bg-season-summer/30 border-season-summer/50",
  autumn: "bg-season-autumn/30 border-season-autumn/50",
  winter: "bg-season-winter/30 border-season-winter/50",
};

function getTimeLabel(hours: number): string {
  if (hours >= 5 && hours < 7) return "Dawn";
  if (hours >= 7 && hours < 12) return "Morning";
  if (hours >= 12 && hours < 17) return "Day";
  if (hours >= 17 && hours < 20) return "Dusk";
  if (hours >= 20 && hours < 22) return "Evening";
  return "Night";
}

export function TimeDisplay({ time }: TimeDisplayProps) {
  const { hours, minutes, day, season } = time;
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  return (
    <View className="flex-row items-center gap-1.5">
      {/* Time of day */}
      <View className="flex-row items-center gap-1 rounded-full bg-black/25 px-2 py-0.5">
        <Text className="text-xs font-medium text-white">{getTimeLabel(hours)}</Text>
        <Text className="text-xs font-medium text-white">{timeString}</Text>
      </View>

      {/* Day and Season */}
      <View
        className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${SEASON_COLORS[season]}`}
      >
        <Text className="text-xs font-medium capitalize text-white">{SEASON_LABELS[season]}</Text>
        <Text className="text-xs font-medium text-white">D{day}</Text>
      </View>
    </View>
  );
}

/** Compact version for very small screens -- shows just time period + season. */
export function TimeDisplayCompact({ time }: TimeDisplayProps) {
  const { hours, season } = time;

  return (
    <View className="flex-row items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5">
      <Text className="text-xs text-white">{getTimeLabel(hours)}</Text>
      <Text className="text-xs capitalize text-white">{SEASON_LABELS[season]}</Text>
    </View>
  );
}
