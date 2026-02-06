import { useEffect, useState } from "react";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloatingParticle {
  id: string;
  text: string;
  color: string;
  createdAt: number;
  /** Random horizontal offset in px to prevent overlap */
  offsetX: number;
}

interface ParticleStore {
  particles: FloatingParticle[];
  addParticle: (text: string, color?: string) => void;
  removeParticle: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 5;
const ANIMATION_DURATION_MS = 1200;
const FLOAT_DISTANCE_PX = 40;
const OFFSET_RANGE_PX = 30;

/**
 * Detect a default color from the particle text content.
 * Falls back to white if no keyword matches.
 */
const detectColor = (text: string): string => {
  if (text.includes("XP")) return "#FFD700";
  if (text.includes("Timber")) return "#8D6E63";
  if (text.includes("Sap")) return "#FFB74D";
  if (text.includes("Fruit")) return "#E57373";
  if (text.includes("Acorns")) return "#81C784";
  if (text.includes("Stamina")) return "#64B5F6";
  return "#FFFFFF";
};

// ---------------------------------------------------------------------------
// CSS Keyframes (injected once)
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = "grovekeeper-floating-particle-keyframes";

const ensureKeyframes = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes gk-particle-float {
  0% {
    opacity: 1;
    transform: translate(var(--gk-particle-ox), 0px);
  }
  100% {
    opacity: 0;
    transform: translate(var(--gk-particle-ox), -${FLOAT_DISTANCE_PX}px);
  }
}
`;
  document.head.appendChild(style);
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let particleCounter = 0;

export const particleStore = create<ParticleStore>((set, get) => ({
  particles: [],

  addParticle: (text: string, color?: string) => {
    particleCounter += 1;
    const id = `particle-${Date.now()}-${particleCounter}`;
    const resolvedColor = color ?? detectColor(text);
    const offsetX =
      Math.round(Math.random() * OFFSET_RANGE_PX * 2) - OFFSET_RANGE_PX;

    const item: FloatingParticle = {
      id,
      text,
      color: resolvedColor,
      createdAt: Date.now(),
      offsetX,
    };

    set((state) => {
      const next = [...state.particles, item];
      // Trim oldest when exceeding max visible
      while (next.length > MAX_VISIBLE) {
        next.shift();
      }
      return { particles: next };
    });

    // Auto-remove after animation completes
    setTimeout(() => {
      get().removeParticle(id);
    }, ANIMATION_DURATION_MS);
  },

  removeParticle: (id: string) => {
    set((state) => ({
      particles: state.particles.filter((p) => p.id !== id),
    }));
  },
}));

// ---------------------------------------------------------------------------
// Convenience helper — callable from anywhere without React context
// ---------------------------------------------------------------------------

export const showParticle = (text: string, color?: string) => {
  particleStore.getState().addParticle(text, color);
};

// ---------------------------------------------------------------------------
// Individual particle element
// ---------------------------------------------------------------------------

interface ParticleProps {
  particle: FloatingParticle;
}

const Particle = ({ particle }: ParticleProps) => {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: 0,
        fontWeight: 700,
        fontSize: 16,
        lineHeight: "20px",
        color: particle.color,
        textShadow:
          "0 1px 3px rgba(0,0,0,0.7), 0 0px 6px rgba(0,0,0,0.4)",
        whiteSpace: "nowrap",
        userSelect: "none",
        willChange: "transform, opacity",
        // CSS custom property drives the horizontal offset inside the keyframe
        // so each particle drifts to its own random column.
        ["--gk-particle-ox" as string]: `${particle.offsetX}px`,
        transform: `translate(${particle.offsetX}px, 0px)`,
        marginLeft: "-50%",
        textAlign: "center",
        animation: `gk-particle-float ${ANIMATION_DURATION_MS}ms ease-out forwards`,
      }}
    >
      {particle.text}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Container — mount once near the app root
// ---------------------------------------------------------------------------

export const FloatingParticlesContainer = () => {
  const particles = particleStore((s) => s.particles);

  // Inject keyframes stylesheet on first mount
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureKeyframes();
    setReady(true);
  }, []);

  if (!ready || particles.length === 0) return null;

  return (
    <div
      className="fixed left-0 right-0 flex justify-center pointer-events-none"
      style={{ top: 80, zIndex: 9998 }}
    >
      <div style={{ position: "relative", width: 0, height: 0 }}>
        {particles.map((p) => (
          <Particle key={p.id} particle={p} />
        ))}
      </div>
    </div>
  );
};
