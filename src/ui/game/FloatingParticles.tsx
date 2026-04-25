import { createSignal, For, onMount, Show } from "solid-js";
import { createSimpleStore } from "@/shared/utils/simpleStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloatingParticle {
  id: string;
  text: string;
  color: string;
  createdAt: number;
  offsetX: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 5;
const ANIMATION_DURATION_MS = 1200;
const FLOAT_DISTANCE_PX = 40;
const OFFSET_RANGE_PX = 30;

const detectColor = (text: string): string => {
  if (text.includes("XP")) return "#FFD700";
  if (text.includes("Timber")) return "#8D6E63";
  if (text.includes("Sap")) return "#FFB74D";
  if (text.includes("Fruit")) return "#E57373";
  if (text.includes("Acorns")) return "#81C784";
  if (text.includes("Stamina")) return "#64B5F6";
  return "#FFFFFF";
};

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
@media (prefers-reduced-motion: reduce) {
  @keyframes gk-particle-float {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }
}
`;
  document.head.appendChild(style);
};

let particleCounter = 0;

export const particleStore = createSimpleStore<{
  particles: FloatingParticle[];
}>({ particles: [] });

function addParticle(text: string, color?: string): void {
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

  particleStore.set((state) => {
    const next = [...state.particles, item];
    while (next.length > MAX_VISIBLE) {
      next.shift();
    }
    return { particles: next };
  });

  setTimeout(() => {
    particleStore.set((state) => ({
      particles: state.particles.filter((p) => p.id !== id),
    }));
  }, ANIMATION_DURATION_MS);
}

export const showParticle = (text: string, color?: string) => {
  addParticle(text, color);
};

interface ParticleProps {
  particle: FloatingParticle;
}

const Particle = (props: ParticleProps) => {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: "0",
        "font-weight": 700,
        "font-size": "16px",
        "line-height": "20px",
        color: props.particle.color,
        "text-shadow": "0 1px 3px rgba(0,0,0,0.7), 0 0px 6px rgba(0,0,0,0.4)",
        "white-space": "nowrap",
        "user-select": "none",
        "will-change": "transform, opacity",
        "--gk-particle-ox": `${props.particle.offsetX}px`,
        transform: `translate(${props.particle.offsetX}px, 0px)`,
        "margin-left": "-50%",
        "text-align": "center",
        animation: `gk-particle-float ${ANIMATION_DURATION_MS}ms ease-out forwards`,
      }}
    >
      {props.particle.text}
    </span>
  );
};

export const FloatingParticlesContainer = () => {
  const particles = particleStore.use((s) => s.particles);
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    ensureKeyframes();
    setReady(true);
  });

  return (
    <Show when={ready() && particles().length > 0}>
      <div
        class="fixed left-0 right-0 flex justify-center pointer-events-none"
        style={{ top: "80px", "z-index": 9998 }}
      >
        <div style={{ position: "relative", width: "0", height: "0" }}>
          <For each={particles()}>{(p) => <Particle particle={p} />}</For>
        </div>
      </div>
    </Show>
  );
};
