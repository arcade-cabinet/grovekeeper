import { createSignal, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import type { AppDatabase } from "@/db/client";
import { getDb, isDbInitialized } from "@/db/client";
import { createWorld } from "@/db/repos/worldsRepo";
import type { NewWorld, World } from "@/db/schema/rc";
import { GroveVignette } from "./GroveVignette";

/**
 * NewGameScreen — full-screen new-world setup.
 * One column, two inputs (seed + Gardener name), one Begin.
 * No difficulty selector — RC dropped it.
 */
interface NewGameScreenProps {
  onCreated?: (world: World) => void;
  onCancel?: () => void;
  /** Test seam — overrides worldsRepo.createWorld. */
  createWorldFn?: (db: AppDatabase, world: NewWorld) => World;
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

export const NewGameScreen = (props: NewGameScreenProps) => {
  const [seed, setSeed] = createSignal<string>(rollSeed());
  const [name, setName] = createSignal<string>("Gardener");
  const [error, setError] = createSignal<string | null>(null);

  const trimmedName = () => name().trim();
  const canSubmit = () => trimmedName().length > 0 && seed().trim().length > 0;

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
      class="relative min-h-screen w-full flex flex-col items-center justify-center p-6"
      style={{ "background-color": "#030806" }}
    >
      <GroveVignette dim />

      <form
        onSubmit={handleSubmit}
        class="relative z-10 flex flex-col items-center gap-8 w-full max-w-md"
        aria-label="New grove"
        novalidate
      >
        <header class="flex flex-col items-center gap-2 text-center">
          <h1
            class="text-3xl sm:text-4xl font-semibold tracking-[0.16em]"
            style={{
              color: "#f5e1a4",
              "text-shadow": "0 0 24px rgba(245, 225, 164, 0.3)",
              "font-family":
                "Fredoka, var(--font-heading), 'Iowan Old Style', serif",
            }}
          >
            A new grove
          </h1>
          <p
            class="text-sm italic tracking-wide"
            style={{ color: "rgba(240, 234, 220, 0.6)" }}
          >
            Name yourself, choose a seed, and step in.
          </p>
        </header>

        <fieldset class="flex flex-col gap-5 w-full border-0 p-0 m-0">
          <label class="flex flex-col gap-2">
            <span
              class="text-xs uppercase tracking-[0.2em]"
              style={{ color: "rgba(245, 225, 164, 0.7)" }}
            >
              Gardener
            </span>
            <input
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class="min-h-[48px] rounded-md px-4 py-3 text-base bg-transparent border focus:outline-none focus:ring-2"
              style={{
                color: "#f0eadc",
                "border-color": "rgba(245, 225, 164, 0.35)",
                "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
              }}
              maxlength={32}
              required
            />
          </label>

          <div class="flex flex-col gap-2">
            <label
              for="new-game-seed"
              class="text-xs uppercase tracking-[0.2em]"
              style={{ color: "rgba(245, 225, 164, 0.7)" }}
            >
              World seed
            </label>
            <div class="flex items-stretch gap-2">
              <input
                id="new-game-seed"
                type="text"
                value={seed()}
                onInput={(e) => setSeed(e.currentTarget.value)}
                class="flex-1 min-h-[48px] rounded-md px-4 py-3 text-base bg-transparent border font-mono tracking-widest focus:outline-none focus:ring-2"
                style={{
                  color: "#f0eadc",
                  "border-color": "rgba(245, 225, 164, 0.35)",
                  "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
                }}
                required
              />
              <button
                type="button"
                onClick={handleReroll}
                class="min-w-[48px] min-h-[48px] rounded-md px-3 text-lg transition-all hover:brightness-125 focus:outline-none focus:ring-2"
                style={{
                  "background-color": "transparent",
                  color: "rgba(240, 234, 220, 0.85)",
                  border: "1px solid rgba(245, 225, 164, 0.35)",
                  "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
                }}
                aria-label="Reroll seed"
              >
                {"\u{1F3B2}"}
              </button>
            </div>
          </div>
        </fieldset>

        <Show when={error()}>
          <p class="text-sm" role="alert" style={{ color: "#e89097" }}>
            {error()}
          </p>
        </Show>

        <div class="flex flex-col gap-3 w-full">
          <button
            type="submit"
            disabled={!canSubmit()}
            class="w-full min-h-[52px] rounded-lg px-6 py-3 text-base sm:text-lg font-medium tracking-wide transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none"
            style={{
              "background-color": "rgba(245, 225, 164, 0.92)",
              color: "#1c130b",
              "box-shadow": "0 0 32px rgba(245, 225, 164, 0.25)",
              "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
              "--tw-ring-offset-color": "#030806",
            }}
          >
            Begin
          </button>
          <button
            type="button"
            onClick={handleCancel}
            class="w-full min-h-[44px] rounded-lg px-6 py-2 text-sm tracking-wide transition-all hover:brightness-125 focus-visible:outline-none focus-visible:ring-2"
            style={{
              "background-color": "transparent",
              color: "rgba(240, 234, 220, 0.6)",
              "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
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
