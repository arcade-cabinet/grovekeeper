import { Show } from "solid-js";
import type { Spirit } from "@/config/spirits";
import { COLORS } from "@/config/config";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";

interface Props {
  spirit: Spirit;
  open: boolean;
  onClose: () => void;
  /** True if the player has spoken with this spirit at least once before. */
  hasMet: boolean;
}

/**
 * SpiritDialogue — modal card shown when the player contacts a Grovekeeper spirit.
 *
 * UI-only: reads `hasMet` to choose the correct dialogue line, but does NOT
 * modify any Koota traits or claim rewards. Reward claiming is T74.
 */
export const SpiritDialogue = (props: Props) => {
  const dialogueLine = () =>
    props.hasMet
      ? (props.spirit.dialogue.subsequent[0] ?? props.spirit.dialogue.greeting)
      : props.spirit.dialogue.firstMeet;

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent
        class="max-w-sm"
        style={{
          background: COLORS.parchment,
          border: `2px solid ${props.spirit.appearance.haloColorHex}`,
          "border-radius": "20px",
          "box-shadow": `0 0 32px ${props.spirit.appearance.orbColorHex}cc, 0 8px 24px rgba(0,0,0,0.18)`,
          padding: "0",
          overflow: "hidden",
        }}
      >
        {/* Orb + halo header band */}
        <div
          class="flex flex-col items-center gap-2 pt-6 pb-4 px-6"
          style={{
            background: `linear-gradient(180deg, ${props.spirit.appearance.orbColorHex}55 0%, transparent 100%)`,
          }}
        >
          <SpiritOrb
            orbColor={props.spirit.appearance.orbColorHex}
            haloColor={props.spirit.appearance.haloColorHex}
            scale={props.spirit.appearance.scale}
          />
          <DialogHeader class="items-center text-center">
            <DialogTitle
              class="text-lg font-bold"
              style={{
                "font-family": "var(--gk-font-display, inherit)",
                color: COLORS.soilDark,
              }}
            >
              {props.spirit.name}
            </DialogTitle>
            <p
              class="text-xs font-medium uppercase tracking-widest mt-0.5"
              style={{ color: props.spirit.appearance.haloColorHex }}
            >
              {props.spirit.aspect}
            </p>
          </DialogHeader>
        </div>

        {/* Dialogue text */}
        <div class="px-6 pb-2">
          <div
            class="rounded-xl p-4 text-sm leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.72)",
              color: COLORS.soilDark,
              border: `1px solid ${props.spirit.appearance.orbColorHex}`,
              "min-height": "64px",
            }}
          >
            <Show when={!props.hasMet}>
              <span
                class="block text-xs font-semibold mb-1.5"
                style={{ color: props.spirit.appearance.haloColorHex }}
              >
                First meeting
              </span>
            </Show>
            <p>{dialogueLine()}</p>
          </div>
        </div>

        {/* Lore snippet (first meet only) */}
        <Show when={!props.hasMet}>
          <div class="px-6 pb-2">
            <p
              class="text-xs italic leading-relaxed text-center"
              style={{ color: COLORS.earthRed, opacity: 0.8 }}
            >
              {props.spirit.reward.lore}
            </p>
          </div>
        </Show>

        {/* Footer */}
        <DialogFooter class="px-6 pb-6 pt-2 sm:justify-center">
          <button
            type="button"
            class="w-full rounded-xl py-3 px-6 text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.97] motion-safe:transition-transform touch-manipulation"
            style={{
              background: `linear-gradient(135deg, ${props.spirit.appearance.haloColorHex}, ${props.spirit.appearance.orbColorHex})`,
              color: COLORS.soilDark,
              "min-height": "44px",
              "box-shadow": `0 2px 8px ${props.spirit.appearance.haloColorHex}66`,
            }}
            onClick={props.onClose}
          >
            Thank the spirit
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* -------------------------------------------------------------------------- */
/* SpiritOrb — a glowing CSS/SVG orb using the spirit's palette               */
/* -------------------------------------------------------------------------- */

interface SpiritOrbProps {
  orbColor: string;
  haloColor: string;
  /** Spirit appearance.scale — used to modulate orb size slightly (clamped). */
  scale: number;
}

const SpiritOrb = (props: SpiritOrbProps) => {
  // Keep orb visually consistent regardless of scale value; scale is just a
  // slight tweak (±10%) so the dial still means something in T71 3D rendering.
  const size = () => Math.round(56 + (props.scale - 1) * 12);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: `${size()}px`,
        height: `${size()}px`,
        "flex-shrink": "0",
      }}
    >
      {/* Halo pulse ring */}
      <div
        class="absolute inset-0 rounded-full"
        style={{
          background: "transparent",
          border: `3px solid ${props.haloColor}`,
          "border-radius": "50%",
          opacity: 0.5,
          transform: "scale(1.35)",
          animation: "gk-spirit-halo 2.4s ease-in-out infinite",
        }}
      />
      {/* Core orb */}
      <svg
        viewBox="0 0 56 56"
        width={size()}
        height={size()}
        aria-hidden="true"
        style={{ "flex-shrink": "0" }}
      >
        <defs>
          <radialGradient id="spirit-orb-grad" cx="38%" cy="32%" r="62%">
            <stop offset="0%" stop-color="white" stop-opacity="0.9" />
            <stop offset="45%" stop-color={props.orbColor} stop-opacity="1" />
            <stop offset="100%" stop-color={props.haloColor} stop-opacity="0.85" />
          </radialGradient>
          <filter id="spirit-orb-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="28"
          cy="28"
          r="26"
          fill="url(#spirit-orb-grad)"
          filter="url(#spirit-orb-glow)"
        />
        {/* Inner specular highlight */}
        <ellipse cx="22" cy="18" rx="8" ry="5" fill="white" opacity="0.35" />
      </svg>
    </div>
  );
};

/* Inject the halo keyframe once on first render */
let _haloStyleInjected = false;
if (typeof document !== "undefined" && !_haloStyleInjected) {
  _haloStyleInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      @keyframes gk-spirit-halo {
        0%,100% { opacity: 0.3; transform: scale(1.3); }
        50%      { opacity: 0.7; transform: scale(1.45); }
      }
    }
  `;
  document.head.appendChild(style);
}
