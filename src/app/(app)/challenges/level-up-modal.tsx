"use client";

import { startTransition, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, Sparkles } from "lucide-react";

interface Props {
  level: number;
  levelName: string;
}

export function LevelUpModal({ level, levelName }: Props) {
  const [visible, setVisible] = useState(true);
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      color: string;
      delay: number;
      duration: number;
    }>
  >([]);

  useEffect(() => {
    // Generate confetti particles
    const colors = ["#7af17a", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      duration: 1 + Math.random() * 2,
    }));
    startTransition(() => setParticles(newParticles));
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="relative">
        {/* Confetti */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute animate-bounce"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        <div className="bg-gradient-to-b from-brand-dark to-background rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden border border-border/50 shadow-2xl shadow-brand/10">
          <div className="absolute inset-0 opacity-10">
            <Sparkles className="h-full w-full text-brand" />
          </div>

          <div className="relative z-10">
            <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Star className="h-10 w-10 text-brand" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Niveau {level} !
            </h2>
            <p className="text-brand text-lg font-semibold mb-2">{levelName}</p>
            <p className="text-white/60 text-sm mb-6">
              Félicitations ! Vous avez atteint un nouveau niveau. Continuez
              comme ça !
            </p>

            <Button
              className="bg-brand text-brand-dark hover:bg-brand/90 font-bold px-8"
              onClick={() => setVisible(false)}
            >
              Continuer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
