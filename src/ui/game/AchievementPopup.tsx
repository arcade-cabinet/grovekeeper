import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { COLORS } from "@/config/config";
import { createSimpleStore } from "@/shared/utils/simpleStore";
import { ACHIEVEMENT_DEFS } from "@/systems/achievements";

export interface AchievementPopupItem {
  id: string;
  achievementId: string;
  createdAt: number;
}

const AUTO_DISMISS_MS = 4000;
const SPARKLE_COUNT = 8;

const CATEGORY_EMOJIS: Record<string, string> = {
  planting: "\u{1F331}",
  growth: "\u{1F333}",
  resource: "\u{1FAB5}",
  grid: "\u{1F30D}",
  diversity: "\u{1F33F}",
  seasonal: "\u{2744}\uFE0F",
  prestige: "\u{1F31F}",
};

const ACHIEVEMENT_EMOJI_MAP: Record<string, string> = {
  "first-seed": CATEGORY_EMOJIS.planting,
  "seed-spreader": CATEGORY_EMOJIS.planting,
  "forest-founder": CATEGORY_EMOJIS.planting,
  "one-of-each": CATEGORY_EMOJIS.diversity,
  "patient-gardener": CATEGORY_EMOJIS.growth,
  "old-growth-guardian": CATEGORY_EMOJIS.growth,
  "timber-baron": CATEGORY_EMOJIS.resource,
  "sap-collector": CATEGORY_EMOJIS.resource,
  "the-giving-tree": CATEGORY_EMOJIS.resource,
  "canopy-complete": CATEGORY_EMOJIS.grid,
  "full-grove": CATEGORY_EMOJIS.grid,
  biodiversity: CATEGORY_EMOJIS.diversity,
  "seasonal-veteran": CATEGORY_EMOJIS.seasonal,
  "enchanted-grove": CATEGORY_EMOJIS.growth,
  "new-beginnings": CATEGORY_EMOJIS.prestige,
};

let popupCounter = 0;

export const achievementPopupStore = createSimpleStore<{
  popup: AchievementPopupItem | null;
}>({ popup: null });

function clearPopup(): void {
  achievementPopupStore.set({ popup: null });
}

export const showAchievement = (achievementId: string) => {
  popupCounter += 1;
  const id = `achievement-popup-${Date.now()}-${popupCounter}`;
  const item: AchievementPopupItem = {
    id,
    achievementId,
    createdAt: Date.now(),
  };

  achievementPopupStore.set({ popup: item });

  setTimeout(() => {
    const current = achievementPopupStore.get().popup;
    if (current && current.id === id) {
      clearPopup();
    }
  }, AUTO_DISMISS_MS);
};

let stylesInjected = false;

function injectSparkleStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      @keyframes gk-sparkle-pulse {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
      }
      .gk-sparkle { animation: gk-sparkle-pulse 2s ease-in-out infinite; }
      @keyframes gk-achievement-enter {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes gk-achievement-exit {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    }
    .gk-sparkle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: #FFD700;
      border-radius: 50%;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

interface SparkleOverlayProps {
  count: number;
}

const SparkleOverlay = (props: SparkleOverlayProps) => {
  const sparkles = () =>
    Array.from({ length: props.count }, (_, i) => {
      const angle = (i / props.count) * 2 * Math.PI;
      const radius = 160;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      const delay = i * 0.2;
      return { x, y, delay, key: `sparkle-${x}-${y}` };
    });

  return (
    <For each={sparkles()}>
      {(s) => (
        <div
          class="gk-sparkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            "animation-delay": `${s.delay}s`,
          }}
        />
      )}
    </For>
  );
};

interface AnimatedAchievementPopupProps {
  item: AchievementPopupItem;
  onDismiss: () => void;
}

const AnimatedAchievementPopup = (props: AnimatedAchievementPopupProps) => {
  const [phase, setPhase] = createSignal<"enter" | "visible" | "exit">("enter");

  const achievementDef = () =>
    ACHIEVEMENT_DEFS.find((a) => a.id === props.item.achievementId);
  const emoji = () =>
    ACHIEVEMENT_EMOJI_MAP[props.item.achievementId] || "\u2728";

  onMount(() => {
    injectSparkleStyles();
    const t1 = setTimeout(() => setPhase("visible"), 300);
    onCleanup(() => clearTimeout(t1));
  });

  onMount(() => {
    const remaining = AUTO_DISMISS_MS - (Date.now() - props.item.createdAt);
    const exitDelay = Math.max(remaining - 300, 0);
    const timer = setTimeout(() => setPhase("exit"), exitDelay);
    onCleanup(() => clearTimeout(timer));
  });

  createEffect(() => {
    if (phase() !== "exit") return;
    const t = setTimeout(() => props.onDismiss(), 300);
    onCleanup(() => clearTimeout(t));
  });

  const animationName = () => {
    const p = phase();
    if (p === "enter") return "gk-achievement-enter";
    if (p === "exit") return "gk-achievement-exit";
    return "none";
  };

  return (
    <div
      role="dialog"
      aria-live="assertive"
      aria-labelledby="achievement-title"
      class="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{ "z-index": 10000 }}
    >
      <button
        type="button"
        class="absolute inset-0 bg-black pointer-events-auto border-0 cursor-pointer"
        style={{
          opacity: phase() === "visible" ? 0.6 : 0,
          transition: "opacity 300ms ease-out",
        }}
        onClick={props.onDismiss}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") {
            props.onDismiss();
          }
        }}
        aria-label="Close achievement popup"
      />

      <div
        class="relative pointer-events-auto"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "calc(100vw - 48px)",
          "max-width": "360px",
          background: COLORS.skyMist,
          border: "3px solid #FFD700",
          "border-radius": "16px",
          padding: "24px",
          "box-shadow": "0 8px 32px rgba(0,0,0,0.4)",
          animation: `${animationName()} 300ms ease-out`,
          "animation-fill-mode": "both",
        }}
      >
        <SparkleOverlay count={SPARKLE_COUNT} />

        <div
          class="flex items-center justify-center mb-4"
          style={{ "font-size": "64px" }}
          aria-hidden="true"
        >
          {emoji()}
        </div>

        <h2
          id="achievement-title"
          class="text-center font-bold mb-2"
          style={{
            "font-family": "var(--gk-font-display)",
            "font-size": "24px",
            color: COLORS.soilDark,
          }}
        >
          {achievementDef() ? achievementDef()?.name : props.item.achievementId}
        </h2>

        <Show when={achievementDef()}>
          <p
            class="text-center mb-4"
            style={{
              "font-size": "14px",
              color: COLORS.forestGreen,
              "line-height": 1.5,
            }}
          >
            {achievementDef()?.description}
          </p>
        </Show>

        <button
          type="button"
          class="w-full py-2 px-4 rounded-lg font-semibold"
          style={{
            background: COLORS.autumnGold,
            color: "white",
            "font-size": "16px",
          }}
          onClick={props.onDismiss}
        >
          Claim
        </button>
      </div>
    </div>
  );
};

export const AchievementPopupContainer = () => {
  const popup = achievementPopupStore.use((s) => s.popup);

  return (
    <Show when={popup()}>
      {(item) => (
        <AnimatedAchievementPopup item={item()} onDismiss={clearPopup} />
      )}
    </Show>
  );
};
