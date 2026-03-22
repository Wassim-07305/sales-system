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
  // Negative margins to counteract the parent <main> padding (p-4 md:p-8)
  // and override the max-w-[1400px] wrapper so chat fills edge-to-edge
  return (
    <div className="-m-4 md:-m-8 max-w-none">
      <MessagingContainer />
    </div>
  );
}
