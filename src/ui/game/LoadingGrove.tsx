import { createSignal, For, onCleanup, onMount } from "solid-js";
import { COLORS } from "@/config/config";
import { VoxelTreeCanvas } from "./VoxelTreeCanvas";

/**
 * LoadingGrove — Suspense fallback for the lazy-loaded GameScene.
 *
 * Shown during the gap between "Plant the Seed" submit (or "Continue
 * Grove" click) and the Jolly Pixel runtime finishing init. Without
 * it the player sees a flat dark void with the words "Loading
 * grove...", which reads as POC. This bridges the gap with the same
 * cozy aesthetic as MainMenu / NewGameScreen so the journey from
 * landing to in-game stays continuous.
 *
 * Composition:
 *   - Sky → leaf → forest gradient backdrop (matches MainMenu).
 *   - Sun halo with gentle pulse.
 *   - Drifting leaf particles (slightly fewer — the focus is the tree).
 *   - One large voxel tree center-stage, spinning slowly.
 *   - Status text below: "Planting your grove..." → cycles through
 *     a small pool of cozy task descriptions on a 2.5s cadence so
 *     the screen feels alive even on long loads.
 *   - Subtle progress dots beneath the text.
 *
 * Honors prefers-reduced-motion (sun pulse + leaf drift + tree spin
 * all freeze; status text still cycles since it's the only signal
 * that the load is making progress).
 */
interface LoadingGroveProps {
  /** Optional override for the tree variant rendered. Default tree-04. */
  treeId?: string;
  /** Optional status override; if omitted, cycles through cozy tasks. */
  status?: string;
}

const COZY_STATUSES = [
  "Planting your grove…",
  "Tilling the soil…",
  "Calling the morning birds…",
  "Letting the sunlight in…",
  "Setting out a workbench…",
  "Stacking firewood…",
  "Easing the dew off the leaves…",
];

const driftingLeaves = [
  {
    x: "10%",
    y: "12%",
    dx: "30px",
    dy: "70vh",
    rot: "180deg",
    dur: "10s",
    delay: "0s",
    size: "0.85rem",
  },
  {
    x: "78%",
    y: "8%",
    dx: "-25px",
    dy: "75vh",
    rot: "-130deg",
    dur: "12s",
    delay: "2.5s",
    size: "0.95rem",
  },
  {
    x: "44%",
    y: "18%",
    dx: "20px",
    dy: "65vh",
    rot: "210deg",
    dur: "11s",
    delay: "4.5s",
    size: "0.9rem",
  },
  {
    x: "88%",
    y: "30%",
    dx: "-40px",
    dy: "55vh",
    rot: "150deg",
    dur: "9s",
    delay: "1.5s",
    size: "0.9rem",
  },
];

export const LoadingGrove = (props: LoadingGroveProps) => {
  const [statusIdx, setStatusIdx] = createSignal(0);

  let interval: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    if (props.status) return;
    interval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % COZY_STATUSES.length);
    }, 2500);
  });
  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  const status = () => props.status ?? COZY_STATUSES[statusIdx()];

  return (
    <div
      class="relative w-full h-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 45%, ${COLORS.forestGreen}40 100%)`,
      }}
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes leaf-float {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.55; }
          85%  { opacity: 0.4; }
          100% { transform: translate(var(--leaf-dx), var(--leaf-dy)) rotate(var(--leaf-rot)); opacity: 0; }
        }
        .leaf-particle {
          animation: leaf-float var(--leaf-dur) ease-in-out infinite;
          animation-delay: var(--leaf-delay);
          will-change: transform, opacity;
        }
        @keyframes sun-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.78; transform: scale(1.04); }
        }
        .sun-halo { animation: sun-pulse 9s ease-in-out infinite; }

        @keyframes loading-dot-pulse {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%      { opacity: 1;    transform: translateY(-2px); }
        }
        .loading-dot {
          animation: loading-dot-pulse 1.4s ease-in-out infinite;
        }
        .loading-dot:nth-child(2) { animation-delay: 0.18s; }
        .loading-dot:nth-child(3) { animation-delay: 0.36s; }

        @media (prefers-reduced-motion: reduce) {
          .leaf-particle, .sun-halo, .loading-dot { animation: none; opacity: 0.6; }
        }
      `}</style>

      {/* Sun halo */}
      <div
        class="sun-halo absolute pointer-events-none"
        aria-hidden="true"
        style={{
          top: "8%",
          left: "50%",
          transform: "translate(-50%, 0)",
          width: "min(72vw, 560px)",
          height: "min(72vw, 560px)",
          background:
            "radial-gradient(circle, rgba(255, 233, 178, 0.55) 0%, rgba(255, 233, 178, 0.18) 40%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* Drifting leaves */}
      <div
        class="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <For each={driftingLeaves}>
          {(l) => (
            <div
              class="leaf-particle absolute"
              style={{
                left: l.x,
                top: l.y,
                "font-size": l.size,
                "--leaf-dx": l.dx,
                "--leaf-dy": l.dy,
                "--leaf-rot": l.rot,
                "--leaf-dur": l.dur,
                "--leaf-delay": l.delay,
                color: COLORS.leafLight,
              }}
            >
              {"\u{1F343}"}
            </div>
          )}
        </For>
      </div>

      {/* Center stack */}
      <main
        class="relative flex flex-col items-center gap-5 sm:gap-6"
        style={{ "z-index": 5 }}
      >
        <div aria-hidden="true">
          <VoxelTreeCanvas
            treeId={props.treeId ?? "tree-04"}
            width={260}
            height={300}
            initialYaw={0.2}
            spinSpeed={0.35}
          />
        </div>

        <p
          class="text-base sm:text-lg italic font-medium text-center min-h-[1.5em]"
          style={{
            color: COLORS.barkBrown,
            "text-shadow": "0 1px 0 rgba(255, 255, 255, 0.5)",
          }}
        >
          {status()}
        </p>

        <div class="flex items-end gap-1.5 mt-1" aria-hidden="true">
          <span
            class="loading-dot inline-block w-2 h-2 rounded-full"
            style={{ background: COLORS.forestGreen }}
          />
          <span
            class="loading-dot inline-block w-2 h-2 rounded-full"
            style={{ background: COLORS.forestGreen }}
          />
          <span
            class="loading-dot inline-block w-2 h-2 rounded-full"
            style={{ background: COLORS.forestGreen }}
          />
        </div>
      </main>
    </div>
  );
};
