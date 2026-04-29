/**
 * NpcSpeechBubble.
 *
 * Solid-JS overlay component that renders a phrase-pool dialogue line
 * above an NPC's screen position. Lifecycle:
 *   - mounts when the parent passes a non-null `phrase`,
 *   - fades in,
 *   - holds for `holdSeconds` (default `npc.config.json:bubbleHoldSeconds`),
 *   - fades out,
 *   - calls `onDismiss` so the parent can null its state.
 *
 * The component is a *display* primitive only — it does NOT pick the
 * phrase, persist anything, or know about ECS / actors. The parent
 * (an `InteractionSystem` or the GameScene) owns:
 *   - finding the nearest NPC,
 *   - calling `actor.interact(...)` for the phrase,
 *   - updating screen position each frame (camera changes will move
 *     the bubble's anchor),
 *   - persisting the phrase id via `dialogueRepo`.
 *
 * Visual style: warm, rounded-rect, subtle shadow, soft cream
 * background. Word-wrapped via CSS. Touch-safe — tapping outside
 * dismisses (handled by the parent listening for `tap-outside`).
 *
 * Mobile-first sizing: 80% viewport width max; 14px body floor; bubble
 * is positioned absolutely so it never overlaps the bottom action bar.
 */

import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { COLORS } from "@/config/config";
import npcConfig from "@/game/scene/npc.config.json";

export interface NpcSpeechBubbleProps {
  /** Phrase text. `null` collapses the bubble. */
  phrase: string | null;
  /**
   * Bubble anchor in CSS pixels (top-left of the phrase box). Parent
   * recomputes this each frame from the NPC's world position projected
   * through the camera.
   */
  screenX: number;
  screenY: number;
  /** Override for the auto-dismiss timer. Defaults to npc.config. */
  holdSeconds?: number;
  /** Fired when the bubble auto-dismisses or the user taps outside. */
  onDismiss?: () => void;
}

/** Default hold duration before fade-out, from `npc.config.json`. */
export const DEFAULT_BUBBLE_HOLD_SECONDS =
  npcConfig.interaction.bubbleHoldSeconds;

export function NpcSpeechBubble(props: NpcSpeechBubbleProps) {
  const [visible, setVisible] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  // Phrase change → reset the visibility + timer.
  createEffect(() => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (props.phrase) {
      // Trigger a reflow before fading in by deferring one tick. This
      // is necessary so the opacity transition fires; without it the
      // browser would batch the mount + opacity=1 into one frame.
      setVisible(false);
      requestAnimationFrame(() => setVisible(true));
      const hold = (props.holdSeconds ?? DEFAULT_BUBBLE_HOLD_SECONDS) * 1000;
      timer = setTimeout(() => {
        setVisible(false);
        // Wait for fade-out before announcing dismiss so the parent
        // doesn't tear us down mid-transition.
        timer = setTimeout(() => {
          props.onDismiss?.();
          timer = null;
        }, FADE_OUT_MS);
      }, hold);
    } else {
      setVisible(false);
    }
  });

  // Tap-outside-to-dismiss. Bubble is absolutely positioned; pointer
  // events on the document body that aren't on us collapse it early.
  const handleDocumentPointerDown = (e: PointerEvent) => {
    if (!props.phrase) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-npc-speech-bubble]")) return;
    setVisible(false);
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      props.onDismiss?.();
      timer = null;
    }, FADE_OUT_MS);
  };

  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      if (timer !== null) clearTimeout(timer);
    });
  }

  return (
    <Show when={props.phrase}>
      <div
        data-npc-speech-bubble
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          left: `${props.screenX}px`,
          top: `${props.screenY}px`,
          transform: "translate(-50%, -100%)",
          "max-width": "min(80vw, 320px)",
          padding: "12px 16px",
          "border-radius": "16px",
          background: `${COLORS.parchment}f5`,
          border: `2px solid ${COLORS.barkBrown}`,
          color: COLORS.soilDark,
          "font-size": "15px",
          "line-height": "1.45",
          "font-family": "Nunito, system-ui, sans-serif",
          "box-shadow": `0 6px 18px ${COLORS.soilDark}40, 0 1px 0 rgba(255,255,255,0.6) inset`,
          "pointer-events": "auto",
          opacity: visible() ? 1 : 0,
          transition: `opacity ${FADE_IN_MS}ms ease-out`,
          "z-index": 50,
          "user-select": "none",
        }}
      >
        {props.phrase}
        {/* Speech-bubble tail. Pure CSS — a small triangle below the
            box, centred horizontally. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "-9px",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            "border-left": "9px solid transparent",
            "border-right": "9px solid transparent",
            "border-top": `9px solid ${COLORS.barkBrown}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "-7px",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            "border-left": "8px solid transparent",
            "border-right": "8px solid transparent",
            "border-top": `8px solid ${COLORS.parchment}f5`,
          }}
        />
      </div>
    </Show>
  );
}

/** Fade-in/out durations in ms — matched to a slow Ghibli feel. */
const FADE_IN_MS = 220;
const FADE_OUT_MS = 260;
