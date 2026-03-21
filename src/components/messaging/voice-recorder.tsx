"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, X, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number, levels: number[]) => void;
}

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const elapsedRef = useRef(0);
  const levelsRef = useRef<number[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);
  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        toast.error(
          "L'enregistrement vocal n'est pas supporte par ce navigateur",
        );
        return;
      }
      mimeTypeRef.current = mimeType;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        // Use refs to get latest values
        onRecordingComplete(blob, elapsedRef.current, [...levelsRef.current]);
      };

      mediaRecorder.start(100);
      setRecording(true);
      setElapsed(0);
      setLevels([]);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      const updateLevels = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = Math.min(
          1,
          (data.reduce((a, b) => a + b, 0) / data.length / 255) * 3,
        );
        setLevels((prev) => [...prev.slice(-50), avg]);
        animFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch {
      toast.error("Impossible d'acceder au microphone");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      // Override onstop to not call onRecordingComplete
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setRecording(false);
    setElapsed(0);
    setLevels([]);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  // Not recording → show mic button
  if (!recording) {
    return (
      <button
        onClick={startRecording}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        title="Message vocal"
      >
        <Mic className="w-4 h-4" />
      </button>
    );
  }

  // Recording in progress — popup above input
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-80">
      <div className="bg-surface border border-border rounded-2xl shadow-lg p-3 relative">
        {/* Close button */}
        <button
          onClick={cancelRecording}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />

          {/* Live waveform */}
          <div className="flex-1 flex items-end gap-[2px] h-8">
            {levels.slice(-40).map((level, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-primary/60 transition-all duration-75"
                style={{ height: `${Math.max(level * 100, 8)}%` }}
              />
            ))}
            {levels.length < 40 &&
              Array.from({ length: 40 - levels.length }).map((_, i) => (
                <div
                  key={`e-${i}`}
                  className="flex-1 rounded-full bg-border"
                  style={{ height: "8%" }}
                />
              ))}
          </div>

          {/* Timer */}
          <span className="text-xs font-mono text-muted-foreground w-10 text-right shrink-0">
            {formatTime(elapsed)}
          </span>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shrink-0"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Preview component for recorded audio in the input area
interface VoicePreviewProps {
  blob: Blob;
  duration: number;
  levels: number[];
  onRemove: () => void;
}

export function VoicePreview({
  blob,
  duration,
  levels,
  onRemove,
}: VoicePreviewProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    urlRef.current = URL.createObjectURL(blob);
    if (audioRef.current) {
      audioRef.current.src = urlRef.current;
    }
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [blob]);

  /* eslint-disable react-hooks/immutability */
  const tick = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const dur = isFinite(el.duration) ? el.duration : duration;
    if (dur > 0) setProgress(el.currentTime / dur);
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
    if (!audioRef.current || !urlRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // Ne set src que si pas encore chargé
      if (!audioRef.current.src || audioRef.current.src === "") {
        audioRef.current.src = urlRef.current;
      }
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // Normalize levels to always have 35 bars
  const displayLevels =
    levels.length >= 35
      ? levels.slice(-35)
      : [...levels, ...Array(35 - levels.length).fill(0.05)];

  const progressIndex = Math.floor(progress * displayLevels.length);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/20">
      <audio
        ref={audioRef}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        className="hidden"
      />

      <button
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors shrink-0"
      >
        {playing ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-end gap-[2px] h-6">
        {displayLevels.map((level, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-75"
            style={{
              height: `${Math.max(level * 100, 12)}%`,
              backgroundColor:
                i <= progressIndex && playing
                  ? "var(--primary)"
                  : i <= progressIndex && progress > 0
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          />
        ))}
      </div>

      <span className="text-[11px] font-mono text-primary shrink-0">
        {formatTime(playing ? Math.floor(progress * duration) : duration)}
      </span>

      <button
        onClick={onRemove}
        className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
