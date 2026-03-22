"use client";

import dynamic from "next/dynamic";
import React from "react";

const MessagingContainer = dynamic(
  () =>
    import("@/components/messaging/messaging-container").then((m) => ({
      default: m.MessagingContainer,
    })),
  { ssr: false },
);

/** Error boundary to catch React #310 and display diagnostic info */
class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; info: string }
> {
  state: { error: Error | null; info: string } = { error: null, info: "" };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ChatErrorBoundary] Caught:", error);
    console.error("[ChatErrorBoundary] Component stack:", errorInfo.componentStack);
    this.setState({ info: errorInfo.componentStack ?? "" });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-2xl w-full rounded-xl border bg-background p-6 space-y-4">
            <h2 className="text-lg font-bold text-destructive">
              Erreur dans la messagerie
            </h2>
            <p className="text-sm text-foreground">
              {this.state.error.message}
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium mb-2">
                Stack technique (pour le debug)
              </summary>
              <pre className="whitespace-pre-wrap bg-muted rounded-lg p-3 overflow-auto max-h-64">
                {this.state.info}
              </pre>
            </details>
            <button
              onClick={() => this.setState({ error: null, info: "" })}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ChatPageClient() {
  // Negative margins to counteract the parent <main> padding (p-4 md:p-8)
  // and override the max-w-[1400px] wrapper so chat fills edge-to-edge
  return (
    <div className="-m-4 md:-m-8 max-w-none">
      <ChatErrorBoundary>
        <MessagingContainer />
      </ChatErrorBoundary>
    </div>
  );
}
