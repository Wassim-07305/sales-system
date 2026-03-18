"use client";

import dynamic from "next/dynamic";

const MessagingContainer = dynamic(
  () =>
    import("@/components/messaging/messaging-container").then((m) => ({
      default: m.MessagingContainer,
    })),
  { ssr: false },
);

export function ChatPageClient() {
  return <MessagingContainer />;
}
