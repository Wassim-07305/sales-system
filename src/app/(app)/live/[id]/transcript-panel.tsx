"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, Download, ScrollText } from "lucide-react";
import { useCallStore } from "@/stores/call-store";
import { TranscriptEntryLine } from "./transcript-entry";

interface TranscriptPanelProps {
  sessionTitle: string;
  onClose: () => void;
}

export function TranscriptPanel({
  sessionTitle,
  onClose,
}: TranscriptPanelProps) {
  const transcriptEntries = useCallStore((s) => s.transcriptEntries);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcriptEntries]);

  const handleDownload = useCallback(() => {
    if (transcriptEntries.length === 0) return;

    const lines = transcriptEntries.map((entry) => {
      const mins = Math.floor(entry.timestamp / 60000);
      const secs = Math.floor((entry.timestamp % 60000) / 1000);
      const ts = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      return `[${ts}] ${entry.speaker}: ${entry.text}`;
    });

    const header = `Transcript — ${sessionTitle}\nDate: ${new Date().toLocaleDateString("fr-FR")}\n${"─".repeat(50)}\n\n`;
    const content = header + lines.join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcriptEntries, sessionTitle]);

  return (
    <div className="w-80 flex flex-col bg-card border-l border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Transcription
            {transcriptEntries.length > 0 && (
              <span className="text-muted-foreground ml-1.5">
                ({transcriptEntries.length})
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {transcriptEntries.length > 0 && (
            <button
              onClick={handleDownload}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Telecharger"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {transcriptEntries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            La transcription apparaitra ici lorsqu&apos;elle sera activee.
          </p>
        )}
        {transcriptEntries.map((entry) => (
          <TranscriptEntryLine
            key={entry.id}
            speaker={entry.speaker}
            text={entry.text}
            timestamp={entry.timestamp}
          />
        ))}
      </div>
    </div>
  );
}
