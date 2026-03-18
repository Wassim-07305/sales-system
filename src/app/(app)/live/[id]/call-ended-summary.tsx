"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Radio, Download, ArrowLeft, Clock, ScrollText } from "lucide-react";
import type { TranscriptEntry } from "@/lib/types/database";

interface CallEndedSummaryProps {
  session: { id: string; title: string };
  durationSeconds: number | null;
  transcriptEntries: TranscriptEntry[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallEndedSummary({
  session,
  durationSeconds,
  transcriptEntries,
}: CallEndedSummaryProps) {
  const router = useRouter();

  const handleDownloadTranscript = useCallback(() => {
    if (transcriptEntries.length === 0) return;

    const lines = transcriptEntries.map((entry) => {
      const mins = Math.floor(entry.timestamp / 60000);
      const secs = Math.floor((entry.timestamp % 60000) / 1000);
      const ts = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      return `[${ts}] ${entry.speaker}: ${entry.text}`;
    });

    const header = `Transcript — ${session.title}\nDate: ${new Date().toLocaleDateString("fr-FR")}\n${"─".repeat(50)}\n\n`;
    const content = header + lines.join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${session.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcriptEntries, session]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background gap-8 p-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Radio className="w-8 h-8 text-muted-foreground" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Session terminee
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{session.title}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6">
        {durationSeconds != null && durationSeconds > 0 && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatDuration(durationSeconds)}
            </span>
          </div>
        )}
        {transcriptEntries.length > 0 && (
          <div className="flex items-center gap-2 text-foreground/80">
            <ScrollText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {transcriptEntries.length} entree
              {transcriptEntries.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {transcriptEntries.length > 0 && (
          <button
            onClick={handleDownloadTranscript}
            className="h-10 px-5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Telecharger le transcript
          </button>
        )}
        <button
          onClick={() => router.push("/live")}
          className="h-10 px-5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au hub Live
        </button>
      </div>
    </div>
  );
}
