import { Show } from "solid-js";
import { COLORS } from "@/config/config";
import type { WeatherType } from "@/systems/weather";

interface WeatherForecastProps {
  currentWeather: WeatherType;
  weatherTimeRemaining: number;
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

export const WeatherForecast = (props: WeatherForecastProps) => {
  const minutes = () => Math.ceil(props.weatherTimeRemaining / 60);

  return (
    <div
      role="region"
      aria-label={`Weather: ${WEATHER_LABELS[props.currentWeather]}${props.currentWeather !== "clear" ? `, ${Math.ceil(props.weatherTimeRemaining / 60)} minutes remaining` : ""}`}
      class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: `${COLORS.parchment}e6`,
        border: `2px solid ${COLORS.barkBrown}`,
        color: COLORS.soilDark,
        "box-shadow": "0 4px 12px rgba(26, 58, 42, 0.15)",
      }}
    >
      <span class="text-sm" aria-hidden="true">
        {WEATHER_ICONS[props.currentWeather]}
      </span>
      <span aria-hidden="true">{WEATHER_LABELS[props.currentWeather]}</span>
      <Show when={props.currentWeather !== "clear"}>
        <span class="opacity-60">~{minutes()}m</span>
      </Show>
      <span class="opacity-40">|</span>
      <span class="opacity-60 italic">
        {SEASON_HINTS[props.currentSeason] ?? ""}
      </span>
    </div>
  );
};
