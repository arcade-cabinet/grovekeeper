/**
 * FloatingParticles -- Floating number overlays for resource/XP gains.
 *
 * Spawns "+XP", "+Timber" etc. text that floats upward and fades out.
 * Uses react-native-reanimated for smooth 60fps animation.
 */

import { observable } from "@legendapp/state";
import { useSelector } from "@legendapp/state/react";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Types
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Observable state
// ---------------------------------------------------------------------------

let particleCounter = 0;

const floatingParticleState$ = observable<FloatingParticleState>({ particles: [] });

function addParticle(text: string, x: number, y: number, color?: string) {
  particleCounter += 1;
  const id = `fp-${Date.now()}-${particleCounter}`;

  // Infer color from text content
  const inferredColor =
    color ??
    Object.entries(TYPE_COLORS).find(([key]) => text.toLowerCase().includes(key))?.[1] ??
    DEFAULT_COLOR;

  const particle: FloatingParticle = {
    id,
    text,
    color: inferredColor,
    x,
    y,
    createdAt: Date.now(),
  };

  const next = [...floatingParticleState$.particles.peek(), particle];
  while (next.length > MAX_PARTICLES) {
    next.shift();
  }
  floatingParticleState$.particles.set(next);

  setTimeout(() => {
    removeParticle(id);
  }, PARTICLE_DURATION_MS + 200);
}

function removeParticle(id: string) {
  floatingParticleState$.particles.set(
    floatingParticleState$.particles.peek().filter((p) => p.id !== id),
  );
}

// ---------------------------------------------------------------------------
// Hook -- selector-compatible API for consumers
// ---------------------------------------------------------------------------

interface FloatingParticleStore {
  particles: FloatingParticle[];
  addParticle: typeof addParticle;
  removeParticle: typeof removeParticle;
}

export function useFloatingParticleStore<T = FloatingParticleStore>(
  selector?: (state: FloatingParticleStore) => T,
): T {
  const particles = useSelector(() => floatingParticleState$.particles.get());
  const state: FloatingParticleStore = { particles, addParticle, removeParticle };
  if (selector) return selector(state);
  return state as unknown as T;
}

/**
 * Convenience function to spawn a floating particle from anywhere.
 */
export function spawnFloatingText(text: string, screenX: number, screenY: number, color?: string) {
  addParticle(text, screenX, screenY, color);
}

// ---------------------------------------------------------------------------
// Single particle component
// ---------------------------------------------------------------------------

function FloatingText({ particle }: { particle: FloatingParticle }) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);

  const _remove = useFloatingParticleStore((s) => s.removeParticle);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 150 });
    translateY.value = withTiming(-60, { duration: PARTICLE_DURATION_MS });
    opacity.value = withDelay(
      PARTICLE_DURATION_MS * 0.5,
      withTiming(0, { duration: PARTICLE_DURATION_MS * 0.5 }),
    );
  }, [opacity, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      className="absolute items-center"
      style={[{ left: particle.x - 40, top: particle.y }, animatedStyle]}
      pointerEvents="none"
    >
      <Text
        className="text-sm font-bold"
        style={{
          color: particle.color,
          textShadowColor: "rgba(0,0,0,0.6)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
          minWidth: 80,
          textAlign: "center",
        }}
      >
        {particle.text}
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Container -- mount once in the game screen
// ---------------------------------------------------------------------------

export function FloatingParticlesContainer() {
  const particles = useFloatingParticleStore((s) => s.particles);

  if (particles.length === 0) return null;

  return (
    <View className="absolute inset-0" pointerEvents="none" style={{ zIndex: 9998 }}>
      {particles.map((p) => (
        <FloatingText key={p.id} particle={p} />
      ))}
    </View>
  );
}
