import { createSignal, onMount, Show } from "solid-js";
import { actions as gameActions } from "@/actions";
import { getDb, isDbInitialized } from "@/db/client";
import { listWorlds } from "@/db/repos/worldsRepo";
import type { World } from "@/db/schema/rc";
import { Credits } from "./Credits";
import { GroveVignette } from "./GroveVignette";

/**
 * MainMenu — post-landing surface. Renders the same Grove vignette as
 * index.html so the still-life of the landing fades into a live screen
 * rather than hard-cutting.
 *
 * Two choices: Begin (always visible, transitions to NewGameScreen)
 * and Continue (visible only when at least one world is persisted —
 * resumes the most recent one).
 *
 * Tone: hushed reverence, no mascot, no leaf particles, no card chrome.
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
      class="relative min-h-screen w-full flex flex-col items-center justify-center p-6"
      style={{ "background-color": "#030806" }}
    >
      <GroveVignette />

      <main class="relative z-10 flex flex-col items-center gap-10 w-full max-w-md">
        <header class="flex flex-col items-center gap-4 text-center">
          <h1
            class="text-5xl sm:text-6xl font-semibold tracking-[0.18em]"
            style={{
              color: "#f5e1a4",
              "text-shadow": "0 0 24px rgba(245, 225, 164, 0.35)",
              "font-family":
                "Fredoka, var(--font-heading), 'Iowan Old Style', serif",
            }}
          >
            Grovekeeper
          </h1>
          <p
            class="text-sm sm:text-base italic tracking-wide"
            style={{
              color: "rgba(240, 234, 220, 0.82)",
              "text-shadow": "0 1px 6px rgba(0, 0, 0, 0.55)",
            }}
          >
            Every forest begins with a single seed.
          </p>
        </header>

        <nav
          class="flex flex-col items-center gap-3 w-full"
          aria-label="Main menu"
        >
          <button
            type="button"
            onClick={handleBegin}
            class="w-full min-h-[52px] rounded-lg px-6 py-3 text-base sm:text-lg font-medium tracking-wide transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              "background-color": "rgba(245, 225, 164, 0.92)",
              color: "#1c130b",
              "box-shadow": "0 0 32px rgba(245, 225, 164, 0.25)",
              "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
              "--tw-ring-offset-color": "#030806",
            }}
            aria-label="Begin a new grove"
          >
            Begin
          </button>

          <Show when={hasSave()}>
            <button
              type="button"
              onClick={handleContinue}
              class="w-full min-h-[52px] rounded-lg px-6 py-3 text-base sm:text-lg font-medium tracking-wide transition-all hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                "background-color": "transparent",
                color: "rgba(240, 234, 220, 0.85)",
                border: "1px solid rgba(245, 225, 164, 0.35)",
                "--tw-ring-color": "rgba(245, 225, 164, 0.65)",
                "--tw-ring-offset-color": "#030806",
              }}
              aria-label="Continue the most recent grove"
            >
              Continue
            </button>
          </Show>
        </nav>
      </main>

      <footer
        class="relative z-10 mt-10 flex items-center gap-3 text-xs"
        style={{ color: "rgba(240, 234, 220, 0.4)" }}
      >
        <p>Grovekeeper v1.0.0-alpha.1</p>
        <Credits />
      </footer>
    </div>
  );
};
