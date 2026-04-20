import { ErrorBoundary, type JSX } from "solid-js";

interface Props {
  children: JSX.Element;
  onReset?: () => void;
}

function handleReload() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    caches.keys().then((names) => {
      for (const name of names) caches.delete(name);
    });
  }
  window.location.reload();
}

export function GameErrorBoundary(props: Props) {
  return (
    <ErrorBoundary
      fallback={(err, reset) => {
        const msg = (err as Error | undefined)?.message ?? "Unknown error";
        const isChunkError =
          msg.includes("Failed to fetch") ||
          msg.includes("Loading chunk") ||
          msg.includes("dynamically imported module");
        console.error("[Grovekeeper] Game error:", err);
        return (
          <div class="flex flex-col items-center justify-center h-full bg-[#1a0e0a] text-white p-8">
            <h2 class="text-2xl font-bold mb-4">Something went wrong</h2>
            <p class="text-gray-400 mb-6 text-center max-w-md">
              {isChunkError
                ? "A new version is available. Please reload to update."
                : "The game encountered an error. Your latest progress may not be saved."}
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                onClick={handleReload}
                class="px-6 py-3 bg-[#4A7C59] rounded-lg text-white font-semibold"
              >
                Reload Game
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  props.onReset?.();
                }}
                class="px-6 py-3 bg-[#2D5A27] rounded-lg text-white font-semibold"
              >
                Return to Menu
              </button>
            </div>
            <p class="text-gray-600 text-xs mt-4 max-w-md text-center break-all">
              {msg}
            </p>
          </div>
        );
      }}
    >
      {props.children}
    </ErrorBoundary>
  );
}
