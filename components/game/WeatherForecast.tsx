/**
 * WeatherForecast -- Compact weather status widget.
 *
 * Shows current weather icon, label, remaining time for active events,
 * and a seasonal hint. Designed as a pill-shaped HUD element.
 */

import { View } from "react-native";
import { Text } from "@/components/ui/text";
import type { WeatherType } from "@/game/systems/weather";

export interface WeatherForecastProps {
  currentWeather: WeatherType;
  weatherTimeRemaining: number; // seconds remaining on current event
  currentSeason: string;
}

const WEATHER_ICONS: Record<WeatherType, string> = {
  clear: "\u2600\uFE0F",
  rain: "\uD83C\uDF27\uFE0F",
  drought: "\uD83C\uDFDC\uFE0F",
  windstorm: "\uD83D\uDCA8",
};

const WEATHER_LABELS: Record<WeatherType, string> = {
  clear: "Clear",
  rain: "Rain",
  drought: "Drought",
  windstorm: "Windstorm",
};

const SEASON_HINTS: Record<string, string> = {
  spring: "Rain likely",
  summer: "Drought risk",
  autumn: "Winds expected",
  winter: "Cold and dry",
};

export function WeatherForecast({
  currentWeather,
  weatherTimeRemaining,
  currentSeason,
}: WeatherForecastProps) {
  const minutes = Math.ceil(weatherTimeRemaining / 60);

  return (
    <View
      className="flex-row items-center gap-2 rounded-full border border-bark-brown px-3 py-1.5"
      style={{ backgroundColor: "rgba(245, 240, 227, 0.9)" }}
    >
      {/* Weather icon */}
      <Text className="text-sm">{WEATHER_ICONS[currentWeather]}</Text>

      {/* Weather label */}
      <Text className="text-xs font-medium text-soil-dark">
        {WEATHER_LABELS[currentWeather]}
      </Text>

      {/* Time remaining (only for active weather events) */}
      {currentWeather !== "clear" && (
        <Text className="text-xs text-soil-dark opacity-60">~{minutes}m</Text>
      )}

      {/* Separator */}
      <Text className="text-xs text-soil-dark opacity-40">|</Text>

      {/* Seasonal hint */}
      <Text className="text-xs italic text-soil-dark opacity-60">
        {SEASON_HINTS[currentSeason] ?? ""}
      </Text>
    </View>
  );
}
