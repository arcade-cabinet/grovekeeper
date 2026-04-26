import { createMemo, createSignal, For, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { COLORS } from "@/config/config";
import type { AppDatabase } from "@/db/client";
import { getDb, isDbInitialized } from "@/db/client";
import { createWorld } from "@/db/repos/worldsRepo";
import type { NewWorld, World } from "@/db/schema/rc";
import { VoxelTreeCanvas } from "./VoxelTreeCanvas";

/**
 * NewGameScreen — full-screen new-world setup.
 *
 * Cozy-elevated to match MainMenu: sky→leaf→forest gradient backdrop,
 * sun halo, drifting leaf particles, warm Card chrome with green
 * border + gradient + shadow, gradient Begin button, ghost Back button.
 *
 * Diegetic touch: a small voxel-tree preview deterministically derived
 * from the current seed value renders to the right of the form. As the
 * player rerolls, the tree changes — this is "the first seed you'll
 * plant" rather than an abstract string.
 */
interface NewGameScreenProps {
  onCreated?: (world: World) => void;
  onCancel?: () => void;
  /** Test seam — overrides worldsRepo.createWorld. */
  createWorldFn?: (db: AppDatabase, world: NewWorld) => World;
}

const SEED_TREE_VARIANTS = [
  "tree-01",
  "tree-02",
  "tree-04",
  "tree-06",
  "tree-12",
  "tree-14",
] as const;

/** Deterministic mapping seed-string → tree-variant id. */
function pickTreeFromSeed(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return SEED_TREE_VARIANTS[Math.abs(h) % SEED_TREE_VARIANTS.length];
}

function rollSeed(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

function newWorldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `world-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

const driftingLeaves = [
  { x: "12%", y: "10%", dx: "30px", dy: "70vh", rot: "180deg", dur: "10s", delay: "0s", size: "0.9rem" },
  { x: "40%", y: "5%", dx: "-25px", dy: "75vh", rot: "-130deg", dur: "12s", delay: "2.5s", size: "0.85rem" },
  { x: "70%", y: "8%", dx: "20px", dy: "65vh", rot: "210deg", dur: "11s", delay: "4.5s", size: "1rem" },
  { x: "88%", y: "18%", dx: "-40px", dy: "60vh", rot: "150deg", dur: "9s", delay: "1.5s", size: "0.9rem" },
  { x: "25%", y: "22%", dx: "45px", dy: "55vh", rot: "200deg", dur: "13s", delay: "5s", size: "0.95rem" },
];

export const NewGameScreen = (props: NewGameScreenProps) => {
  const [seed, setSeed] = createSignal<string>(rollSeed());
  const [name, setName] = createSignal<string>("Gardener");
  const [error, setError] = createSignal<string | null>(null);

  const trimmedName = () => name().trim();
  const canSubmit = () => trimmedName().length > 0 && seed().trim().length > 0;
  const previewTree = createMemo(() => pickTreeFromSeed(seed()));

  const handleReroll = () => setSeed(rollSeed());
  const handleCancel = () => {
    if (props.onCancel) props.onCancel();
    else gameActions().setScreen("menu");
  };

  const handleSubmit = (e?: Event) => {
    e?.preventDefault();
    if (!canSubmit()) {
      setError("A gardener needs a name.");
      return;
    }
    setError(null);

    try {
      const fn = props.createWorldFn;
      const newWorld: NewWorld = {
        id: newWorldId(),
        name: "Grovekeeper",
        gardenerName: trimmedName(),
        worldSeed: seed().trim(),
        difficulty: "sapling",
      };
      const world = fn
        ? fn({} as AppDatabase, newWorld)
        : defaultCreateWorld(getOrThrowDb(), newWorld);

      if (props.onCreated) props.onCreated(world);
      else gameActions().setScreen("playing");
    } catch (err) {
      console.error("Failed to create world:", err);
      setError("Could not plant the seed. Try again.");
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
          10%  { opacity: 0.6; }
          85%  { opacity: 0.42; }
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
        @media (prefers-reduced-motion: reduce) {
          .leaf-particle, .sun-halo { animation: none; opacity: 0.5; }
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
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
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

      {/* Two corner voxel trees on sm+, smaller than MainMenu so the
          form has room. Hidden on phones to keep the inputs centred. */}
      <div
        class="absolute bottom-0 left-0 pointer-events-none hidden md:block"
        aria-hidden="true"
        style={{ "z-index": 1, opacity: 0.85 }}
      >
        <VoxelTreeCanvas
          treeId="tree-04"
          width={220}
          height={300}
          initialYaw={0.4}
          spinSpeed={0.08}
        />
      </div>
      <div
        class="absolute bottom-0 right-0 pointer-events-none hidden md:block"
        aria-hidden="true"
        style={{ "z-index": 1, opacity: 0.85 }}
      >
        <VoxelTreeCanvas
          treeId="tree-06"
          width={220}
          height={300}
          initialYaw={-0.4}
          spinSpeed={-0.08}
        />
      </div>

      {/* Centred Card */}
      <form
        onSubmit={handleSubmit}
        class="relative w-full max-w-sm sm:max-w-md rounded-2xl p-5 sm:p-7 flex flex-col items-stretch gap-5"
        aria-label="New grove"
        novalidate
        style={{
          "z-index": 5,
          background: `linear-gradient(180deg, rgba(255, 253, 247, 0.96) 0%, ${COLORS.skyMist}f2 100%)`,
          border: `3px solid ${COLORS.forestGreen}55`,
          "box-shadow": `0 12px 40px rgba(0, 0, 0, 0.18), 0 0 32px ${COLORS.forestGreen}30, inset 0 1px 0 rgba(255, 255, 255, 0.6)`,
          "backdrop-filter": "blur(2px)",
        }}
      >
        <header class="flex flex-col items-center gap-1.5 text-center">
          <h1
            class="text-2xl sm:text-3xl font-semibold tracking-wider"
            style={{
              color: COLORS.forestGreen,
              "font-family":
                "Fredoka, var(--font-heading), 'Iowan Old Style', serif",
            }}
          >
            A New Grove
          </h1>
          <p
            class="text-xs sm:text-sm italic"
            style={{ color: COLORS.barkBrown }}
          >
            Name yourself, choose a seed, and step in.
          </p>
        </header>

        {/* Seed-preview tree (small voxel render of the variant the
            current seed will spawn). Replaces the abstract dark void
            with a concrete "this is what you're growing." */}
        <div
          class="flex items-center justify-center -my-1"
          aria-hidden="true"
          style={{ "min-height": "120px" }}
        >
          <VoxelTreeCanvas
            treeId={previewTree()}
            width={160}
            height={140}
            initialYaw={0.6}
            spinSpeed={0.22}
          />
        </div>

        <fieldset class="flex flex-col gap-4 border-0 p-0 m-0">
          <label class="flex flex-col gap-1.5">
            <span
              class="text-[0.7rem] uppercase tracking-[0.18em] font-semibold"
              style={{ color: COLORS.barkBrown, opacity: 0.85 }}
            >
              Gardener
            </span>
            <input
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class="min-h-[44px] sm:min-h-[48px] rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2"
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                color: COLORS.barkBrown,
                border: `2px solid ${COLORS.forestGreen}55`,
                "--tw-ring-color": COLORS.forestGreen,
              }}
              maxlength={32}
              required
            />
          </label>

          <div class="flex flex-col gap-1.5">
            <label
              for="new-game-seed"
              class="text-[0.7rem] uppercase tracking-[0.18em] font-semibold"
              style={{ color: COLORS.barkBrown, opacity: 0.85 }}
            >
              World Seed
            </label>
            <div class="flex items-stretch gap-2">
              <input
                id="new-game-seed"
                type="text"
                value={seed()}
                onInput={(e) => setSeed(e.currentTarget.value)}
                class="flex-1 min-h-[44px] sm:min-h-[48px] rounded-lg px-4 py-2.5 text-base font-mono tracking-widest focus:outline-none focus:ring-2"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  color: COLORS.barkBrown,
                  border: `2px solid ${COLORS.forestGreen}55`,
                  "--tw-ring-color": COLORS.forestGreen,
                }}
                required
              />
              <button
                type="button"
                onClick={handleReroll}
                class="min-w-[44px] sm:min-w-[48px] min-h-[44px] sm:min-h-[48px] rounded-lg px-3 text-lg transition-all hover:brightness-110 hover:translate-y-[-1px] focus:outline-none focus:ring-2"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.leafLight} 0%, ${COLORS.leafLight}dd 100%)`,
                  color: COLORS.forestGreen,
                  border: `2px solid ${COLORS.forestGreen}55`,
                  "box-shadow": `0 3px 8px ${COLORS.forestGreen}25`,
                  "--tw-ring-color": COLORS.forestGreen,
                }}
                aria-label="Reroll seed"
                title="Reroll seed"
              >
                {"\u{1F3B2}"}
              </button>
            </div>
          </div>
        </fieldset>

        <Show when={error()}>
          <p
            class="text-sm text-center"
            role="alert"
            style={{ color: "#b14747" }}
          >
            {error()}
          </p>
        </Show>

        <div class="flex flex-col gap-2.5 mt-1">
          <button
            type="submit"
            disabled={!canSubmit()}
            class="w-full min-h-[48px] sm:min-h-[52px] rounded-xl text-base sm:text-lg font-bold tracking-wide transition-all hover:brightness-110 hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0"
            style={{
              background: `linear-gradient(135deg, ${COLORS.forestGreen} 0%, ${COLORS.forestGreen}dd 60%, ${COLORS.forestGreen} 100%)`,
              color: "white",
              "box-shadow": `0 6px 18px ${COLORS.forestGreen}55, inset 0 1px 0 rgba(255, 255, 255, 0.25)`,
              "--tw-ring-color": COLORS.forestGreen,
              "--tw-ring-offset-color": COLORS.skyMist,
            }}
          >
            Plant the Seed
          </button>
          <button
            type="button"
            onClick={handleCancel}
            class="w-full min-h-[40px] rounded-xl px-6 py-2 text-sm font-medium tracking-wide transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "transparent",
              color: COLORS.barkBrown,
              "--tw-ring-color": COLORS.forestGreen,
            }}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
};

function defaultCreateWorld(db: AppDatabase, world: NewWorld): World {
  return createWorld(db, world);
}

function getOrThrowDb(): AppDatabase {
  if (!isDbInitialized()) {
    throw new Error("Database not initialised yet — cannot create world");
  }
  return getDb().db;
}
