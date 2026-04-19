import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Grovekeeper] Game error:", error, errorInfo.componentStack);
    // No explicit save here; rely on existing autosave to avoid cascading errors
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    // Unregister stale service workers and hard reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "Unknown error";
      const isChunkError =
        msg.includes("Failed to fetch") ||
        msg.includes("Loading chunk") ||
        msg.includes("dynamically imported module");
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#1a0e0a] text-white p-8">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-6 text-center max-w-md">
            {isChunkError
              ? "A new version is available. Please reload to update."
              : "The game encountered an error. Your latest progress may not be saved."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-6 py-3 bg-[#4A7C59] rounded-lg text-white font-semibold"
            >
              Reload Game
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-6 py-3 bg-[#2D5A27] rounded-lg text-white font-semibold"
            >
              Return to Menu
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-4 max-w-md text-center break-all">
            {msg}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
