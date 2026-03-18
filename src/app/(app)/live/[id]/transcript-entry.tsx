interface TranscriptEntryLineProps {
  speaker: string;
  text: string;
  timestamp: number;
}

export function TranscriptEntryLine({
  speaker,
  text,
  timestamp,
}: TranscriptEntryLineProps) {
  const mins = Math.floor(timestamp / 60000);
  const secs = Math.floor((timestamp % 60000) / 1000);
  const ts = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex gap-2 text-sm">
      <span className="text-zinc-600 font-mono text-xs mt-0.5 flex-shrink-0">
        [{ts}]
      </span>
      <div>
        <span className="text-[#7af17a] font-medium">{speaker}</span>
        <span className="text-zinc-400 mx-1">:</span>
        <span className="text-zinc-300">{text}</span>
      </div>
    </div>
  );
}
