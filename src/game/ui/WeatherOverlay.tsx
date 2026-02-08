import { useEffect, useState } from "react";
import { create } from "zustand";
import type { WeatherType } from "../systems/weather";

// ---------------------------------------------------------------------------
// Store — updated from the game loop
// ---------------------------------------------------------------------------

interface WeatherVisualStore {
  weather: WeatherType;
  setWeather: (w: WeatherType) => void;
  showPetals: boolean;
  setShowPetals: (show: boolean) => void;
}

export const weatherVisualStore = create<WeatherVisualStore>((set) => ({
  weather: "clear",
  setWeather: (weather) => set({ weather }),
  showPetals: false,
  setShowPetals: (showPetals) => set({ showPetals }),
}));

export const setWeatherVisual = (w: WeatherType) => {
  weatherVisualStore.getState().setWeather(w);
};

export const setShowPetals = (show: boolean) => {
  weatherVisualStore.getState().setShowPetals(show);
};

// ---------------------------------------------------------------------------
// CSS Keyframes (injected once)
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = "grovekeeper-weather-keyframes";

const ensureKeyframes = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes gk-rain-fall {
  0% { transform: translateY(-10vh) translateX(0); opacity: 0.7; }
  100% { transform: translateY(110vh) translateX(-20px); opacity: 0.3; }
}
@keyframes gk-snow-fall {
  0% { transform: translateY(-5vh) translateX(0) rotate(0deg); opacity: 0.8; }
  50% { transform: translateY(50vh) translateX(15px) rotate(180deg); opacity: 0.6; }
  100% { transform: translateY(110vh) translateX(-10px) rotate(360deg); opacity: 0; }
}
@keyframes gk-wind-sway {
  0%, 100% { transform: skewX(0deg); }
  25% { transform: skewX(2deg); }
  75% { transform: skewX(-2deg); }
}
@keyframes gk-petal-fall {
  0% { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity: 0.8; }
  25% { transform: translateY(25vh) translateX(10px) rotate(90deg); opacity: 0.7; }
  50% { transform: translateY(50vh) translateX(-5px) rotate(180deg); opacity: 0.6; }
  75% { transform: translateY(75vh) translateX(8px) rotate(270deg); opacity: 0.4; }
  100% { transform: translateY(110vh) translateX(-12px) rotate(360deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes gk-rain-fall { 0% { opacity: 0.7; } 100% { opacity: 0.3; } }
  @keyframes gk-snow-fall { 0% { opacity: 0.8; } 100% { opacity: 0; } }
  @keyframes gk-wind-sway { 0%, 100% { transform: none; } }
  @keyframes gk-petal-fall { 0% { opacity: 0.8; } 100% { opacity: 0; } }
}
`;
  document.head.appendChild(style);
};

// ---------------------------------------------------------------------------
// Rain particles
// ---------------------------------------------------------------------------

const RAIN_DROP_COUNT = 40;

const RainOverlay = () => {
  const drops = Array.from({ length: RAIN_DROP_COUNT }, (_, i) => {
    const left =
      (i / RAIN_DROP_COUNT) * 100 + Math.random() * (100 / RAIN_DROP_COUNT);
    const delay = Math.random() * 1.5;
    const duration = 0.6 + Math.random() * 0.4;
    return { left, delay, duration, key: `rain-${i}` };
  });

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity: 0.6 }}
    >
      {drops.map((d) => (
        <div
          key={d.key}
          style={{
            position: "absolute",
            left: `${d.left}%`,
            top: 0,
            width: 2,
            height: 18,
            background:
              "linear-gradient(180deg, transparent, rgba(150,200,255,0.6), rgba(100,160,255,0.3))",
            borderRadius: 1,
            animation: `gk-rain-fall ${d.duration}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
      {/* Blue-grey overlay tint */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(100,130,170,0.08)" }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Drought shimmer
// ---------------------------------------------------------------------------

const DroughtOverlay = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,180,60,0.06) 0%, rgba(255,120,20,0.04) 50%, transparent 100%)",
      }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Windstorm
// ---------------------------------------------------------------------------

const WindstormOverlay = () => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{ animation: "gk-wind-sway 2s ease-in-out infinite" }}
  >
    <div
      className="absolute inset-0"
      style={{ background: "rgba(120,120,100,0.06)" }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Cherry Blossom Petals
// ---------------------------------------------------------------------------

const PETAL_COUNT = 25;

const CherryPetalOverlay = () => {
  const petals = Array.from({ length: PETAL_COUNT }, (_, i) => {
    const left = (i / PETAL_COUNT) * 100 + Math.random() * (100 / PETAL_COUNT);
    const delay = Math.random() * 3;
    const duration = 4 + Math.random() * 2;
    return { left, delay, duration, key: `petal-${i}` };
  });

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity: 0.5 }}
    >
      {petals.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: 8,
            height: 8,
            background:
              "radial-gradient(circle, rgba(255,182,193,0.9), rgba(255,105,180,0.6))",
            borderRadius: "50% 0% 50% 0%",
            animation: `gk-petal-fall ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Container — mount once, wrapping the game canvas area
// ---------------------------------------------------------------------------

export const WeatherOverlay = () => {
  const weather = weatherVisualStore((s) => s.weather);
  const showPetals = weatherVisualStore((s) => s.showPetals);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureKeyframes();
    setReady(true);
  }, []);

  if (!ready) return null;

  const hasWeather = weather !== "clear";
  if (!hasWeather && !showPetals) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {weather === "rain" && <RainOverlay />}
      {weather === "drought" && <DroughtOverlay />}
      {weather === "windstorm" && <WindstormOverlay />}
      {showPetals && <CherryPetalOverlay />}
    </div>
  );
};
