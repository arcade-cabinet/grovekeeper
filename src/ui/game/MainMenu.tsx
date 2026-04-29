import { createSignal, For, onMount, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { getDb, isDbInitialized } from "@/db/client";
import { listWorlds } from "@/db/repos/worldsRepo";
import type { World } from "@/db/schema/rc";
import { actions as gameActions } from "@/game/rc-actions";
import { Credits } from "./Credits";
import { Logo } from "./Logo";
import { VoxelTreeCanvas } from "./VoxelTreeCanvas";

/**
 * MainMenu — cozy game title screen for Grovekeeper.
 *
 * Composition (back to front):
 *   1. Sky-to-forest gradient backdrop (skyMist → leafLight → forestGreen).
 *   2. Sun glow halo behind the logo.
 *   3. Two corner voxel trees (real GLTFs from the all-trees pack), gently
 *      auto-rotating. They are the *actual game* trees, not generic SVGs.
 *   4. Drifting leaf-emoji particles foreground layer.
 *   5. A row of small voxel trees along the bottom for parallax depth.
 *   6. Centered Card with the Logo, tagline, Begin / Continue buttons.
 *
 * The original (pre-rewrite) MainMenu had the gradient + leaf particles +
 * Card chrome — sub-wave B's "hushed reverence" rewrite stripped them.
 * This version restores the warmth and elevates the tree silhouettes
 * from flat SVG ellipses to actual voxel-renderer-quality models.
 *
 * Mobile-first: 375px viewport tested, ≥44px tap targets, prefers-reduced-
 * motion disables both leaf drift and tree spin (VoxelTreeCanvas honors
 * the same media query internally).
 */
interface MainMenuProps {
  /** Begin handler. Default: route to `new-game`. */
  onBegin?: () => void;
  /** Continue handler — receives most-recent worldId. Default: `playing`. */
  onContinue?: (worldId: string) => void;
  /** Test seam — supplies the worlds list. */
  worldsProvider?: () => World[];
}

const defaultWorldsProvider = (): World[] => {
  if (!isDbInitialized()) return [];
  try {
    const { db } = getDb();
    return listWorlds(db);
  } catch {
    return [];
  }
};

const driftingLeaves = [
  {
    x: "10%",
    y: "12%",
    dx: "40px",
    dy: "60vh",
    rot: "180deg",
    dur: "9s",
    delay: "0s",
    size: "1rem",
  },
  {
    x: "32%",
    y: "6%",
    dx: "-30px",
    dy: "70vh",
    rot: "-120deg",
    dur: "11s",
    delay: "2s",
    size: "0.85rem",
  },
  {
    x: "58%",
    y: "9%",
    dx: "20px",
    dy: "65vh",
    rot: "200deg",
    dur: "10s",
    delay: "4s",
    size: "0.95rem",
  },
  {
    x: "78%",
    y: "14%",
    dx: "-50px",
    dy: "78vh",
    rot: "-160deg",
    dur: "12s",
    delay: "1s",
    size: "1.05rem",
  },
  {
    x: "88%",
    y: "5%",
    dx: "-25px",
    dy: "60vh",
    rot: "140deg",
    dur: "8s",
    delay: "6s",
    size: "0.8rem",
  },
  {
    x: "20%",
    y: "22%",
    dx: "55px",
    dy: "55vh",
    rot: "210deg",
    dur: "13s",
    delay: "3.5s",
    size: "0.9rem",
  },
  {
    x: "45%",
    y: "16%",
    dx: "-15px",
    dy: "62vh",
    rot: "-110deg",
    dur: "10.5s",
    delay: "5s",
    size: "0.95rem",
  },
];

// Pick four trees for the four positions: two foreground corners + two
// silhouettes nestled into the bottom horizon strip.
const cornerLeftTree = "tree-04"; // pink-blossom — the warmest silhouette
const cornerRightTree = "tree-12"; // tall canopy
const horizonLeftTree = "tree-01";
const horizonRightTree = "tree-14";

export const MainMenu = (props: MainMenuProps) => {
  const [worlds, setWorlds] = createSignal<World[]>([]);

  onMount(() => {
    const provider = props.worldsProvider ?? defaultWorldsProvider;
    setWorlds(provider());
  });

  const hasSave = () => worlds().length > 0;
  const latestWorldId = () => worlds()[0]?.id ?? null;

  const handleBegin = () => {
    if (props.onBegin) {
      props.onBegin();
    } else {
      gameActions().setScreen("new-game");
    }
  };

  const handleContinue = () => {
    const id = latestWorldId();
    if (!id) return;
    if (props.onContinue) {
      props.onContinue(id);
    } else {
      gameActions().setScreen("playing");
    }
  };

  return (
    <div
      class="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${COLORS.skyMist} 0%, ${COLORS.leafLight}40 45%, ${COLORS.forestGreen}40 100%)`,
      }}
    >
      <style>{`
        @keyframes leaf-float {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.65; }
          85%  { opacity: 0.45; }
          100% { transform: translate(var(--leaf-dx), var(--leaf-dy)) rotate(var(--leaf-rot)); opacity: 0; }
        }
        .leaf-particle {
          animation: leaf-float var(--leaf-dur) ease-in-out infinite;
          animation-delay: var(--leaf-delay);
          will-change: transform, opacity;
        }
        @keyframes sun-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.04); }
        }
        .sun-halo {
          animation: sun-pulse 9s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .leaf-particle, .sun-halo { animation: none; opacity: 0.5; }
        }
      `}</style>

      {/* Sun halo — soft warm radial behind everything */}
      <div
        class="sun-halo absolute pointer-events-none"
        aria-hidden="true"
        style={{
          top: "10%",
          left: "50%",
          transform: "translate(-50%, 0)",
          width: "min(70vw, 540px)",
          height: "min(70vw, 540px)",
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

      {/* Corner voxel trees — flank the menu */}
      <div
        class="absolute bottom-0 left-0 pointer-events-none hidden sm:block"
        aria-hidden="true"
        style={{ "z-index": 1 }}
      >
        <VoxelTreeCanvas
          treeId={cornerLeftTree}
          width={260}
          height={340}
          initialYaw={0.3}
          spinSpeed={0.12}
        />
      </div>
      <div
        class="absolute bottom-0 right-0 pointer-events-none hidden sm:block"
        aria-hidden="true"
        style={{ "z-index": 1 }}
      >
        <VoxelTreeCanvas
          treeId={cornerRightTree}
          width={260}
          height={340}
          initialYaw={-0.5}
          spinSpeed={-0.1}
        />
      </div>

      {/* Bottom horizon strip — small voxel trees nestled along ground */}
      <div
        class="absolute bottom-2 left-1/4 -translate-x-1/2 pointer-events-none hidden md:block"
        aria-hidden="true"
        style={{ "z-index": 1, opacity: 0.7 }}
      >
        <VoxelTreeCanvas
          treeId={horizonLeftTree}
          width={140}
          height={180}
          initialYaw={0.8}
          spinSpeed={0.08}
        />
      </div>
      <div
        class="absolute bottom-2 right-1/4 translate-x-1/2 pointer-events-none hidden md:block"
        aria-hidden="true"
        style={{ "z-index": 1, opacity: 0.7 }}
      >
        <VoxelTreeCanvas
          treeId={horizonRightTree}
          width={140}
          height={180}
          initialYaw={-0.8}
          spinSpeed={-0.07}
        />
      </div>

      {/* Centered card */}
      <main
        class="relative w-full max-w-xs sm:max-w-sm rounded-2xl p-5 sm:p-7 flex flex-col items-center gap-5 sm:gap-6"
        style={{
          "z-index": 5,
          background: `linear-gradient(180deg, rgba(255, 253, 247, 0.96) 0%, ${COLORS.skyMist}f5 100%)`,
          border: `3px solid ${COLORS.forestGreen}55`,
          "box-shadow": `0 12px 40px rgba(0, 0, 0, 0.18), 0 0 32px ${COLORS.forestGreen}30, inset 0 1px 0 rgba(255, 255, 255, 0.6)`,
          "backdrop-filter": "blur(2px)",
        }}
      >
        <Logo size={170} />

        <p
          class="text-center text-sm sm:text-base italic"
          style={{ color: COLORS.barkBrown, "letter-spacing": "0.01em" }}
        >
          "Every forest begins with a single seed."
        </p>

        <nav
          class="w-full flex flex-col gap-2.5 sm:gap-3"
          aria-label="Main menu"
        >
          <button
            type="button"
            onClick={handleBegin}
            class="w-full min-h-[48px] sm:min-h-[52px] rounded-xl text-base sm:text-lg font-bold tracking-wide transition-all hover:brightness-110 hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 60%, ${COLORS.forestGreen} 100%)`,
              color: "white",
              "box-shadow": `0 6px 18px ${COLORS.forestGreen}55, inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
              "--tw-ring-color": COLORS.forestGreen,
              "--tw-ring-offset-color": COLORS.skyMist,
            }}
            aria-label="Begin a new grove"
          >
            Begin
          </button>

          <Show when={hasSave()}>
            <button
              type="button"
              onClick={handleContinue}
              class="w-full min-h-[48px] sm:min-h-[52px] rounded-xl text-base sm:text-lg font-bold tracking-wide transition-all hover:brightness-105 hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: "white",
                color: COLORS.forestGreen,
                border: `2px solid ${COLORS.forestGreen}`,
                "box-shadow": `0 4px 12px ${COLORS.forestGreen}25`,
                "--tw-ring-color": COLORS.forestGreen,
                "--tw-ring-offset-color": COLORS.skyMist,
              }}
              aria-label="Continue the most recent grove"
            >
              Continue
            </button>
          </Show>
        </nav>

        <Show when={hasSave()}>
          <p
            class="text-xs sm:text-sm text-center"
            style={{ color: COLORS.barkBrown, opacity: 0.72 }}
          >
            <span class="font-semibold">{worlds().length}</span>{" "}
            {worlds().length === 1 ? "grove" : "groves"} tended
          </p>
        </Show>
      </main>

      <footer
        class="relative mt-5 sm:mt-6 flex items-center gap-3 text-xs"
        style={{ "z-index": 5, color: `${COLORS.barkBrown}c8` }}
      >
        <p>Grovekeeper v1.0.0-alpha.1</p>
        <Credits />
      </footer>
    </div>
  );
};
