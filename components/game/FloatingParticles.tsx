/**
 * FloatingParticles -- Floating number overlays + ECS weather particle overlay.
 *
 * FloatingParticlesContainer: spawns "+XP", "+Timber" etc. text floating upward.
 * WeatherParticlesLayer: 2D weather particles (rain/snow/leaves/dust) from ECS.
 *
 * See GAME_SPEC.md §36.
 */

import { observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { useEntities } from "miniplex-react";
import { useEffect, useMemo } from "react";
import { Dimensions, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { particleEmittersQuery, weatherQuery } from "@/game/ecs/world";
import { useGameStore } from "@/game/stores/gameStore";
import { scopedRNG } from "@/game/utils/seedWords";
import {
  computeDisplayParticleCount,
  computeWindDrift,
  MAX_DISPLAY_WEATHER_PARTICLES,
} from "./floatingParticlesLogic";

// ---------------------------------------------------------------------------
// Floating text particles (XP, resources)
// ---------------------------------------------------------------------------

export interface FloatingParticle {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  createdAt: number;
}

interface FloatingParticleState {
  particles: FloatingParticle[];
}

const MAX_PARTICLES = 6;
const PARTICLE_DURATION_MS = 1200;
const DEFAULT_COLOR = "#FFFFFF";
const TYPE_COLORS: Record<string, string> = {
  xp: "#FFD700",
  timber: "#8B4513",
  sap: "#228B22",
  fruit: "#FF6347",
  acorns: "#D2691E",
};

let particleCounter = 0;
const floatingParticleState$ = observable<FloatingParticleState>({ particles: [] });

function addParticle(text: string, x: number, y: number, color?: string) {
  particleCounter += 1;
  const id = `fp-${Date.now()}-${particleCounter}`;
  const inferredColor =
    color ??
    Object.entries(TYPE_COLORS).find(([key]) => text.toLowerCase().includes(key))?.[1] ??
    DEFAULT_COLOR;
  const particle: FloatingParticle = { id, text, color: inferredColor, x, y, createdAt: Date.now() };
  const next = [...floatingParticleState$.particles.peek(), particle];
  while (next.length > MAX_PARTICLES) next.shift();
  floatingParticleState$.particles.set(next);
  setTimeout(() => removeParticle(id), PARTICLE_DURATION_MS + 200);
}

function removeParticle(id: string) {
  floatingParticleState$.particles.set(floatingParticleState$.particles.peek().filter((p) => p.id !== id));
}

interface FloatingParticleStore {
  particles: FloatingParticle[];
  addParticle: typeof addParticle;
  removeParticle: typeof removeParticle;
}

export function useFloatingParticleStore<T = FloatingParticleStore>(selector?: (state: FloatingParticleStore) => T): T {
  const particles = useSelector(() => floatingParticleState$.particles.get());
  const state: FloatingParticleStore = { particles, addParticle, removeParticle };
  if (selector) return selector(state);
  return state as unknown as T;
}

export function spawnFloatingText(text: string, screenX: number, screenY: number, color?: string) {
  addParticle(text, screenX, screenY, color);
}

function FloatingText({ particle }: { particle: FloatingParticle }) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const _remove = useFloatingParticleStore((s) => s.removeParticle);
  useEffect(() => {
    scale.value = withTiming(1, { duration: 150 });
    translateY.value = withTiming(-60, { duration: PARTICLE_DURATION_MS });
    opacity.value = withDelay(PARTICLE_DURATION_MS * 0.5, withTiming(0, { duration: PARTICLE_DURATION_MS * 0.5 }));
  }, [opacity, translateY, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  return (
    <Animated.View className="absolute items-center" style={[{ left: particle.x - 40, top: particle.y }, animatedStyle]} pointerEvents="none">
      <Text className="text-sm font-bold" style={{ color: particle.color, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, minWidth: 80, textAlign: "center" }}>
        {particle.text}
      </Text>
    </Animated.View>
  );
}

export function FloatingParticlesContainer() {
  const particles = useFloatingParticleStore((s) => s.particles);
  if (particles.length === 0) return null;
  return (
    <View className="absolute inset-0" pointerEvents="none" style={{ zIndex: 9998 }}>
      {particles.map((p) => <FloatingText key={p.id} particle={p} />)}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Weather particle overlay -- reads from ECS ParticleEmitterComponent
// ---------------------------------------------------------------------------

type WeatherPType = "rain" | "snow" | "leaves" | "dust";
const WEATHER_PTYPES: WeatherPType[] = ["rain", "snow", "leaves", "dust"];

function WeatherParticle({ index, total, color, size, lifetimeMs, gravity, windDrift, intensity, worldSeed, isSphere }: { index: number; total: number; color: string; size: number; lifetimeMs: number; gravity: number; windDrift: number; intensity: number; worldSeed: string; isSphere: boolean }) {
  const translateY = useSharedValue(-10);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const leftPct = useMemo(() => { const rng = scopedRNG("wp-left", worldSeed, index); return (index / total) * 100 + rng() * 5; }, [index, total, worldSeed]);
  const startDelay = useMemo(() => { const rng = scopedRNG("wp-delay", worldSeed, index + 2000); return rng() * lifetimeMs; }, [index, lifetimeMs, worldSeed]);
  const travelPx = gravity >= 0 ? 900 : -200;

  useEffect(() => {
    translateY.value = withDelay(startDelay, withRepeat(withSequence(withTiming(-10, { duration: 0 }), withTiming(travelPx, { duration: lifetimeMs, easing: Easing.linear })), -1, false, () => {}, ReduceMotion.Never));
    translateX.value = withDelay(startDelay, withRepeat(withTiming(windDrift, { duration: lifetimeMs }), -1, false));
    opacity.value = withDelay(startDelay, withRepeat(withSequence(withTiming(intensity * 0.6, { duration: lifetimeMs * 0.15 }), withTiming(intensity * 0.3, { duration: lifetimeMs * 0.7 }), withTiming(0, { duration: lifetimeMs * 0.15 })), -1, false, () => {}, ReduceMotion.Never));
  }, [translateY, translateX, opacity, startDelay, lifetimeMs, windDrift, travelPx, intensity]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }, { translateX: translateX.value }], opacity: opacity.value }));
  const dotSize = Math.max(2, size * 80);
  return (
    <Animated.View style={[{ position: "absolute", left: `${leftPct}%`, top: -10, width: isSphere ? dotSize : 1, height: isSphere ? dotSize : 14, backgroundColor: color, borderRadius: isSphere ? 50 : 1 }, animatedStyle]} />
  );
}

/**
 * WeatherParticlesLayer -- driven by ECS ParticleEmitterComponent + WeatherComponent.
 * Mount alongside FloatingParticlesContainer for ECS-driven weather particle effects.
 */
export function WeatherParticlesLayer() {
  useEntities(particleEmittersQuery);
  useEntities(weatherQuery);
  const worldSeed = useGameStore((s) => s.worldSeed);
  const screenWidth = Dimensions.get("window").width;

  const wEnt = weatherQuery.first?.weather;
  const intensity = wEnt?.intensity ?? 0;
  const windDirection = (wEnt?.windDirection ?? [0, -1]) as [number, number];
  const windSpeed = wEnt?.windSpeed ?? 1.0;
  const windDrift = computeWindDrift(windDirection, windSpeed, screenWidth);

  // Collect first active emitter per weather particle type
  const activeEmitters: Partial<Record<WeatherPType, { color: string; size: number; lifetime: number; gravity: number; maxParticles: number }>> = {};
  for (const entity of particleEmittersQuery) {
    const e = entity.particleEmitter;
    if (e.active && WEATHER_PTYPES.includes(e.particleType as WeatherPType)) {
      const t = e.particleType as WeatherPType;
      if (!activeEmitters[t]) activeEmitters[t] = { color: e.color, size: e.size, lifetime: e.lifetime, gravity: e.gravity, maxParticles: e.maxParticles };
    }
  }

  const entries = Object.entries(activeEmitters) as [WeatherPType, NonNullable<(typeof activeEmitters)[WeatherPType]>][];
  if (entries.length === 0 || intensity <= 0) return null;

  return (
    <View className="absolute inset-0" pointerEvents="none" style={{ zIndex: 9997 }}>
      {entries.flatMap(([pType, cfg]) => {
        const count = computeDisplayParticleCount({ maxParticles: cfg.maxParticles }, intensity, MAX_DISPLAY_WEATHER_PARTICLES);
        return Array.from({ length: count }, (_, i) => (
          <WeatherParticle key={`wp-${pType}-${i}`} index={i} total={count} color={cfg.color} size={cfg.size} lifetimeMs={cfg.lifetime * 1000} gravity={cfg.gravity} windDrift={windDrift} intensity={intensity} worldSeed={`${worldSeed}-${pType}`} isSphere={pType === "snow"} />
        ));
      })}
    </View>
  );
}
