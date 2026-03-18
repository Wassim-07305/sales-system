"use client";

import { useState, useEffect } from "react";
import { useCallStore } from "@/stores/call-store";

export function CallTimer() {
  const callStartTime = useCallStore((s) => s.callStartTime);
  const phase = useCallStore((s) => s.phase);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!callStartTime) return;
    if (phase === "ended") return;

    const tick = () =>
      setElapsed(Math.floor((Date.now() - callStartTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [callStartTime, phase]);

  if (!callStartTime) return null;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <span className="font-mono text-xs text-zinc-400 tabular-nums">
      {hours > 0 && `${pad(hours)}:`}
      {pad(minutes)}:{pad(seconds)}
    </span>
  );
}
