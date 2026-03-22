"use client";

import { useState } from "react";
import { Play, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeVideoProps {
  videoUrl?: string | null;
  title?: string;
  description?: string;
  userName?: string;
  onContinue: () => void;
}

export function WelcomeVideo({
  videoUrl,
  title,
  description,
  userName,
  onContinue,
}: WelcomeVideoProps) {
  const [playing, setPlaying] = useState(false);

  // Fallback: no video available — show welcome message card
  if (!videoUrl) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-8 px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/30 flex items-center justify-center shadow-lg shadow-[#10b981]/10">
          <Sparkles className="h-10 w-10 text-[#10b981]" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {title || (
              <>
                Bienvenue{userName ? "," : ""}{" "}
                <span className="text-[#10b981]">{userName || ""}</span>
              </>
            )}
          </h2>
          <p className="text-white/40 text-lg max-w-md mx-auto">
            {description ||
              "Nous sommes ravis de t'accueillir. Prépare-toi à découvrir une plateforme conçue pour booster tes performances commerciales."}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="mt-4 px-8 py-4 bg-gradient-to-r from-[#10b981] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#10b981]/25 hover:shadow-[#10b981]/40 hover:scale-105 transition-all duration-200 flex items-center gap-2"
        >
          Continuer
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 px-4">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {title || "Ta vidéo de bienvenue"}
        </h2>
        {description && (
          <p className="text-white/40 text-base max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Video player */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl">
        {!playing ? (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center group cursor-pointer"
          >
            {/* Thumbnail overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div
              className={cn(
                "relative z-10 w-20 h-20 rounded-full bg-[#10b981]/20 border-2 border-[#10b981]/50",
                "flex items-center justify-center",
                "group-hover:bg-[#10b981]/30 group-hover:scale-110 transition-all duration-300",
                "shadow-lg shadow-[#10b981]/20",
              )}
            >
              <Play className="h-8 w-8 text-[#10b981] ml-1" />
            </div>
          </button>
        ) : (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          >
            <track kind="captions" />
          </video>
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="mt-2 px-8 py-4 bg-gradient-to-r from-[#10b981] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#10b981]/25 hover:shadow-[#10b981]/40 hover:scale-105 transition-all duration-200 flex items-center gap-2"
      >
        Continuer
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
