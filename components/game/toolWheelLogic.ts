/**
 * toolWheelLogic -- Pure hook logic for ToolWheel keyboard / gesture triggers.
 *
 * Extracted to a plain .ts file so unit tests can import without the JSX
 * runtime chain (ToolWheel.tsx → @/components/ui/text → react-native-css-interop).
 *
 * Spec §11: Tab key (desktop) or long-press (mobile) opens the tool selector.
 */

import { useEffect } from "react";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Pure logic (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Returns true when a KeyboardEvent should toggle the ToolWheel.
 *
 * Rules (Spec §11):
 *  - Key must be "Tab"
 *  - Focus must NOT be on an input or textarea element
 */
export function shouldToggleToolWheel(e: Pick<KeyboardEvent, "key" | "target">): boolean {
  if (e.key !== "Tab") return false;
  if (e.target instanceof HTMLInputElement) return false;
  if (e.target instanceof HTMLTextAreaElement) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Registers a `Tab` key listener on the document (web only).
 * When Tab is pressed while no input element is focused, calls `onToggle`.
 * Cleans up the listener when the component unmounts.
 *
 * On native (iOS/Android), this is a no-op — the parent must provide a
 * long-press gesture (e.g. via `onLongPress` on the action button).
 *
 * @param onToggle Callback to open/close the ToolWheel
 */
export function useToolWheelTabKey(onToggle: () => void): void {
  useEffect(() => {
    if (Platform.OS !== "web") return;

    function handleKeyDown(e: KeyboardEvent): void {
      if (!shouldToggleToolWheel(e)) return;
      e.preventDefault();
      onToggle();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onToggle]);
}
