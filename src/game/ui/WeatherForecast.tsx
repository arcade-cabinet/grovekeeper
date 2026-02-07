import { COLORS } from "../constants/config";
import type { WeatherType } from "../systems/weather";

interface WeatherForecastProps {
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

export const WeatherForecast = ({
  currentWeather,
  weatherTimeRemaining,
  currentSeason,
}: WeatherForecastProps) => {
  const minutes = Math.ceil(weatherTimeRemaining / 60);

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: "rgba(245, 240, 227, 0.9)",
        border: `1px solid ${COLORS.barkBrown}`,
        color: COLORS.soilDark,
      }}
    >
      <span className="text-sm">{WEATHER_ICONS[currentWeather]}</span>
      <span>{WEATHER_LABELS[currentWeather]}</span>
      {currentWeather !== "clear" && (
        <span className="opacity-60">~{minutes}m</span>
      )}
      <span className="opacity-40">|</span>
      <span className="opacity-60 italic">
        {SEASON_HINTS[currentSeason] ?? ""}
      </span>
    </div>
  );
};
