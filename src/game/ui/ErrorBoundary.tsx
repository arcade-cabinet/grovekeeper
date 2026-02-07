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
    // Best-effort save — don't throw in error handler
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#1a0e0a] text-white p-8">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-6 text-center max-w-md">
            The game encountered an error. Your progress has been saved.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-6 py-3 bg-[#2D5A27] rounded-lg text-white font-semibold"
          >
            Return to Menu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
