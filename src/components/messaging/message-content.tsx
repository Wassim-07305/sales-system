"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Play,
  Pause,
  FileArchive,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";
import { formatFileSize } from "@/lib/messaging-utils";
import type { EnrichedMessage } from "@/lib/types/messaging";

interface MessageContentProps {
  message: EnrichedMessage;
}

export function MessageContent({ message }: MessageContentProps) {
  // Defensive: ensure content is a string (React #310 guard)
  const safeContent =
    typeof message.content === "string"
      ? message.content
      : String(message.content ?? "");

  const editedBadge = message.is_edited ? (
    <span className="ml-1.5 text-[10px] text-muted-foreground">(modifié)</span>
  ) : null;

  switch (message.content_type) {
    case "image":
      return <ImageContent message={message} />;
    case "video":
      return <VideoContent message={message} />;
    case "audio":
    case "voice":
      return <AudioContent message={message} />;
    case "file":
      return <FileContent message={message} />;
    case "system":
      return (
        <p className="text-xs italic text-muted-foreground">
          {safeContent}
        </p>
      );
    case "text":
    default:
      return (
        <div>
          <TextContent content={safeContent} />
          {editedBadge}
          {/* Inline attachments on text messages */}
          {message.attachments?.length > 0 && (
            <div className="flex flex-col gap-2 mt-1.5">
              {message.attachments.map((att) => {
                if (att.file_type?.startsWith("image/")) {
                  return (
                    <ImageContent
                      key={att.id}
                      message={{
                        ...message,
                        content_type: "image",
                        attachments: [att],
                      }}
                    />
                  );
                }
                return (
                  <FileContent
                    key={att.id}
                    message={{
                      ...message,
                      content_type: "file",
                      attachments: [att],
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
  }
}

function TextContent({ content }: { content: string }) {
  // Defensive: ensure content is always a string (React #310 guard)
  if (typeof content !== "string") {
    console.warn("[TextContent] content is not a string:", content);
    content = String(content ?? "");
  }
  const lines = content.split("\n");
  type BlockType = "quote" | "text" | "ul" | "ol";
  const blocks: Array<{ type: BlockType; content: string; items?: string[] }> =
    [];
  let currentBlock: {
    type: BlockType;
    content: string;
    items?: string[];
  } | null = null;

  for (const line of lines) {
    const isQuoteLine = line.startsWith("> ");
    const bulletMatch = line.match(/^[-*] (.+)/);
    const orderedMatch = line.match(/^\d+\.\s(.+)/);

    let blockType: BlockType;
    let cleanLine: string;

    if (isQuoteLine) {
      blockType = "quote";
      cleanLine = line.slice(2);
    } else if (bulletMatch) {
      blockType = "ul";
      cleanLine = bulletMatch[1];
    } else if (orderedMatch) {
      blockType = "ol";
      cleanLine = orderedMatch[1];
    } else {
      blockType = "text";
      cleanLine = line;
    }

    if (
      currentBlock &&
      currentBlock.type === blockType &&
      (blockType === "ul" || blockType === "ol")
    ) {
      currentBlock.items!.push(cleanLine);
    } else if (
      currentBlock &&
      currentBlock.type === blockType &&
      blockType !== "ul" &&
      blockType !== "ol"
    ) {
      currentBlock.content += "\n" + cleanLine;
    } else {
      if (currentBlock) blocks.push(currentBlock);
      if (blockType === "ul" || blockType === "ol") {
        currentBlock = { type: blockType, content: "", items: [cleanLine] };
      } else {
        currentBlock = { type: blockType, content: cleanLine };
      }
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  return (
    <div>
      {blocks.map((block, i) => {
        if (block.type === "quote") {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-primary/40 pl-3 py-0.5 my-1 text-[14px] text-foreground/70 italic leading-relaxed"
            >
              {renderRichText(block.content)}
            </blockquote>
          );
        }
        if (block.type === "ul") {
          return (
            <ul
              key={i}
              className="list-disc list-inside text-[14px] text-foreground leading-relaxed space-y-0.5 my-1"
            >
              {block.items?.map((item, j) => (
                <li key={j}>{renderRichText(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol
              key={i}
              className="list-decimal list-inside text-[14px] text-foreground leading-relaxed space-y-0.5 my-1"
            >
              {block.items?.map((item, j) => (
                <li key={j}>{renderRichText(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p
            key={i}
            className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap break-words"
          >
            {renderRichText(block.content)}
          </p>
        );
      })}
    </div>
  );
}

function renderRichText(text: string): React.ReactNode[] {
  const pattern =
    /(@(?:tous|channel|[\w\s]+?))(?=[\s,.]|$)|(\*\*(.+?)\*\*)|(__(.+?)__)|(_(.+?)_)|(~~(.+?)~~)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))|(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }

    if (match[1]) {
      const mentionText = match[1];
      const isGroup = /^@(tous|channel)$/i.test(mentionText);
      parts.push(
        <span
          key={match.index}
          className={
            isGroup
              ? "px-1 py-px rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold text-[13px]"
              : "px-0.5 py-px rounded bg-primary/10 text-primary font-medium text-[13px]"
          }
        >
          {mentionText}
        </span>,
      );
    } else if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[3]}
        </strong>,
      );
    } else if (match[4]) {
      parts.push(
        <span key={match.index} className="underline">
          {match[5]}
        </span>,
      );
    } else if (match[6]) {
      parts.push(<em key={match.index}>{match[7]}</em>);
    } else if (match[8]) {
      parts.push(
        <del key={match.index} className="text-muted-foreground">
          {match[9]}
        </del>,
      );
    } else if (match[10]) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded bg-muted text-[13px] font-mono text-foreground"
        >
          {match[11]}
        </code>,
      );
    } else if (match[12]) {
      parts.push(
        <a
          key={match.index}
          href={match[14]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {match[13]}
        </a>,
      );
    } else if (match[15]) {
      parts.push(
        <a
          key={match.index}
          href={match[15]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {match[15]}
        </a>,
      );
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [text];
}

function ImageContent({ message }: { message: EnrichedMessage }) {
  const url =
    message.attachments?.[0]?.file_url ?? message.file_url ?? message.content;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={message.attachments?.[0]?.file_name ?? "image"}
      className="mt-1 max-w-sm max-h-72 rounded-xl border border-border/40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
      loading="lazy"
    />
  );
}

function VideoContent({ message }: { message: EnrichedMessage }) {
  const url =
    message.attachments?.[0]?.file_url ?? message.file_url ?? message.content;
  return (
    <div className="mt-1 max-w-sm">
      <video
        src={url}
        controls
        className="w-full rounded-xl border border-border/40"
      />
    </div>
  );
}

const WAVEFORM_BARS = Array.from(
  { length: 30 },
  (_, i) => Math.max(Math.sin(i * 0.6 + 1) * 0.5 + 0.5, 0.15) * 100,
);

function AudioContent({ message }: { message: EnrichedMessage }) {
  const url =
    message.attachments?.[0]?.file_url ?? message.file_url ?? message.content;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);

  /* eslint-disable react-hooks/immutability */
  const tick = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const dur = isFinite(el.duration) ? el.duration : duration;
    if (dur > 0) {
      setProgress(el.currentTime / dur);
      setCurrentTime(el.currentTime);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [duration]);
  /* eslint-enable react-hooks/immutability */

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, tick]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    const dur = el && isFinite(el.duration) ? el.duration : duration;
    if (!el || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * dur;
    setProgress(pct);
    setCurrentTime(pct * dur);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-1 flex items-center gap-3 px-3 py-2.5 bg-gradient-to-r from-primary/5 to-primary/[0.02] rounded-xl max-w-xs border border-primary/10">
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (el && isFinite(el.duration)) setDuration(el.duration);
        }}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (!el) return;
          if (isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
            setProgress(el.currentTime / el.duration);
            setCurrentTime(el.currentTime);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
      />
      <button
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Lecture"}
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-all active:scale-95"
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      <div className="flex-1 relative h-7 cursor-pointer" onClick={handleSeek} role="slider" aria-label="Position de lecture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="absolute inset-0 flex items-center gap-px">
          {WAVEFORM_BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-muted-foreground/25"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 flex items-center gap-px"
          style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
        >
          {WAVEFORM_BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-primary"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      <span className="text-[11px] text-muted-foreground font-mono shrink-0 w-9 text-right">
        {formatTime(playing ? currentTime : duration)}
      </span>
    </div>
  );
}

function FileContent({ message }: { message: EnrichedMessage }) {
  const attachment = message.attachments?.[0];
  const fileName =
    attachment?.file_name ?? message.file_name ?? message.content;
  const fileUrl = attachment?.file_url ?? message.file_url ?? "#";
  const fileSize = attachment?.file_size;
  const fileType = attachment?.file_type ?? "";

  const FileIcon =
    fileType.includes("zip") || fileType.includes("rar")
      ? FileArchive
      : fileType.includes("sheet") || fileType.includes("csv")
        ? FileSpreadsheet
        : fileType.includes("image")
          ? FileImage
          : FileText;

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/60 transition-colors max-w-xs group"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileIcon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {fileName}
        </p>
        {fileSize ? (
          <p className="text-[11px] text-muted-foreground">
            {formatFileSize(fileSize)}
          </p>
        ) : null}
      </div>
      <Download className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
    </a>
  );
}
