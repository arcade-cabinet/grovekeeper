import { useEffect, useState } from "react";
import { create } from "zustand";
import { COLORS } from "../constants/config";
import { ACHIEVEMENT_DEFS } from "../systems/achievements";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AchievementPopupItem {
  id: string;
  achievementId: string;
  createdAt: number;
}

interface AchievementPopupStore {
  popup: AchievementPopupItem | null;
  showAchievement: (achievementId: string) => void;
  clearPopup: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000;
const SPARKLE_COUNT = 8;

// Category-based emoji mapping
const CATEGORY_EMOJIS: Record<string, string> = {
  planting: "\u{1F331}", // seedling
  growth: "\u{1F333}", // deciduous tree
  resource: "\u{1FAB5}", // wood
  grid: "\u{1F30D}", // globe showing Americas (grid/world)
  diversity: "\u{1F33F}", // herb (multiple plants)
  seasonal: "\u{2744}\uFE0F", // snowflake (seasons)
  prestige: "\u{1F31F}", // glowing star
};

// Map each achievement to a category emoji
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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let popupCounter = 0;

export const achievementPopupStore = create<AchievementPopupStore>(
  (set, get) => ({
    popup: null,

    showAchievement: (achievementId: string) => {
      popupCounter += 1;
      const id = `achievement-popup-${Date.now()}-${popupCounter}`;
      const item: AchievementPopupItem = {
        id,
        achievementId,
        createdAt: Date.now(),
      };

      set({ popup: item });

      // Auto-dismiss
      setTimeout(() => {
        const current = get().popup;
        if (current && current.id === id) {
          get().clearPopup();
        }
      }, AUTO_DISMISS_MS);
    },

    clearPopup: () => {
      set({ popup: null });
    },
  }),
);

// ---------------------------------------------------------------------------
// Convenience helper
// ---------------------------------------------------------------------------

export const showAchievement = (achievementId: string) => {
  achievementPopupStore.getState().showAchievement(achievementId);
};

// ---------------------------------------------------------------------------
// Sparkle animation keyframes (injected once)
// ---------------------------------------------------------------------------

let stylesInjected = false;

function injectSparkleStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      @keyframes gk-sparkle-pulse {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
        }
        50% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
        }
      }

      .gk-sparkle {
        animation: gk-sparkle-pulse 2s ease-in-out infinite;
      }

      @keyframes gk-achievement-enter {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @keyframes gk-achievement-exit {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
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

// ---------------------------------------------------------------------------
// Sparkle overlay component
// ---------------------------------------------------------------------------

interface SparkleOverlayProps {
  count: number;
}

const SparkleOverlay = ({ count }: SparkleOverlayProps) => {
  const sparkles = Array.from({ length: count }, (_, i) => {
    // Position sparkles in a circle around the popup
    const angle = (i / count) * 2 * Math.PI;
    const radius = 160; // px from center
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    const delay = i * 0.2; // stagger animations

    return (
      <div
        key={`sparkle-${x}-${y}`}
        className="gk-sparkle"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          animationDelay: `${delay}s`,
        }}
      />
    );
  });

  return <>{sparkles}</>;
};

// ---------------------------------------------------------------------------
// Popup component with enter/exit transitions
// ---------------------------------------------------------------------------

interface AnimatedAchievementPopupProps {
  item: AchievementPopupItem;
  onDismiss: () => void;
}

const AnimatedAchievementPopup = ({
  item,
  onDismiss,
}: AnimatedAchievementPopupProps) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  const achievementDef = ACHIEVEMENT_DEFS.find(
    (a) => a.id === item.achievementId,
  );
  const emoji = ACHIEVEMENT_EMOJI_MAP[item.achievementId] || "\u2728";

  useEffect(() => {
    injectSparkleStyles();
  }, []);

  // Enter animation on mount — delay matches the 300ms CSS animation duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("visible");
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Schedule exit before auto-dismiss
  useEffect(() => {
    const remaining = AUTO_DISMISS_MS - (Date.now() - item.createdAt);
    const exitDelay = Math.max(remaining - 300, 0);

    const timer = setTimeout(() => {
      setPhase("exit");
    }, exitDelay);

    return () => clearTimeout(timer);
  }, [item.createdAt]);

  // After exit transition, call dismiss
  useEffect(() => {
    if (phase !== "exit") return;
    const timer = setTimeout(() => onDismiss(), 300);
    return () => clearTimeout(timer);
  }, [phase, onDismiss]);

  const animationName =
    phase === "enter"
      ? "gk-achievement-enter"
      : phase === "exit"
        ? "gk-achievement-exit"
        : "none";

  return (
    <div
      role="dialog"
      aria-live="assertive"
      aria-labelledby="achievement-title"
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 10000 }}
    >
      {/* Backdrop overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black pointer-events-auto border-0 cursor-pointer"
        style={{
          opacity: phase === "visible" ? 0.6 : 0,
          transition: "opacity 300ms ease-out",
        }}
        onClick={onDismiss}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") {
            onDismiss();
          }
        }}
        aria-label="Close achievement popup"
      />

      {/* Popup card */}
      <div
        className="relative pointer-events-auto"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "calc(100vw - 48px)",
          maxWidth: 360,
          background: COLORS.skyMist,
          border: "3px solid #FFD700",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: `${animationName} 300ms ease-out`,
          animationFillMode: "both",
        }}
      >
        <SparkleOverlay count={SPARKLE_COUNT} />

        {/* Icon */}
        <div
          className="flex items-center justify-center mb-4"
          style={{ fontSize: 64 }}
          aria-hidden="true"
        >
          {emoji}
        </div>

        {/* Title */}
        <h2
          id="achievement-title"
          className="text-center font-bold mb-2"
          style={{
            fontFamily: "var(--gk-font-display)",
            fontSize: 24,
            color: COLORS.soilDark,
          }}
        >
          {achievementDef ? achievementDef.name : item.achievementId}
        </h2>

        {/* Description */}
        {achievementDef && (
          <p
            className="text-center mb-4"
            style={{
              fontSize: 14,
              color: COLORS.forestGreen,
              lineHeight: 1.5,
            }}
          >
            {achievementDef.description}
          </p>
        )}

        {/* Dismiss button */}
        <button
          type="button"
          className="w-full py-2 px-4 rounded-lg font-semibold"
          style={{
            background: COLORS.autumnGold,
            color: "white",
            fontSize: 16,
          }}
          onClick={onDismiss}
        >
          Claim
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Container — mount this once near the app root
// ---------------------------------------------------------------------------

export const AchievementPopupContainer = () => {
  const popup = achievementPopupStore((s) => s.popup);
  const clearPopup = achievementPopupStore((s) => s.clearPopup);

  if (!popup) return null;

  return (
    <AnimatedAchievementPopup item={popup} onDismiss={() => clearPopup()} />
  );
};
