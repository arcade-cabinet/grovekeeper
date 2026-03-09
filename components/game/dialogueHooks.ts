/**
 * dialogueHooks -- React hooks for dialogue animation (Spec SS33.5).
 *
 * Extracted from NpcDialogue.tsx to keep it under 300 lines.
 * Contains typing animation hook and bounce animation hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { getVisibleCharCount, isTypingComplete, TYPING_SPEED_MS } from "./dialogueAnimations.ts";

// ---------------------------------------------------------------------------
// Bounce arrow animation hook
// ---------------------------------------------------------------------------

export function useBounceAnim() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return anim;
}

// ---------------------------------------------------------------------------
// Typing animation hook
// ---------------------------------------------------------------------------

export function useTypingText(text: string, speed: number = TYPING_SPEED_MS) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const e = now - startTime;
      setElapsed(e);
      if (isTypingComplete(text, e, speed)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  const visibleCount = getVisibleCharCount(text, elapsed, speed);
  const complete = visibleCount >= text.length;
  const displayText = text.slice(0, visibleCount);

  const skipToEnd = useCallback(() => {
    setElapsed(text.length * speed + 1);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [text, speed]);

  return { displayText, complete, skipToEnd };
}
