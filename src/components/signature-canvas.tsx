"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureCanvasProps {
  onSign: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

type StrokeColor = "#000000" | "#1a3a6b";
type StrokeWidth = 1.5 | 2.5 | 4;

const COLORS: { value: StrokeColor; label: string }[] = [
  { value: "#000000", label: "Noir" },
  { value: "#1a3a6b", label: "Bleu" },
];

const WIDTHS: { value: StrokeWidth; label: string }[] = [
  { value: 1.5, label: "Fine" },
  { value: 2.5, label: "Moyenne" },
  { value: 4, label: "Épaisse" },
];

export function SignatureCanvas({
  onSign,
  width,
  height,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [color, setColor] = useState<StrokeColor>("#000000");
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(2.5);
  const [preview, setPreview] = useState<string | null>(null);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [color, strokeWidth]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Update stroke settings without clearing
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }
  }, [color, strokeWidth]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
    setPreview(null);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      setPreview(null);
    }
  }

  function handleValidate() {
    if (!hasDrawn || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setPreview(dataUrl);
    onSign(dataUrl);
  }

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div
        className="relative rounded-lg border-2 border-dashed border-border overflow-hidden"
        style={{ width: width || "100%", height: height || 200 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair bg-white touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">
              Dessinez votre signature ici
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Color selection */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Couleur</span>
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setColor(c.value)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all",
                color === c.value
                  ? "border-[#10b981] scale-110"
                  : "border-border hover:border-muted-foreground",
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        {/* Width selection */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Epaisseur</span>
          {WIDTHS.map((w) => (
            <button
              key={w.value}
              type="button"
              title={w.label}
              onClick={() => setStrokeWidth(w.value)}
              className={cn(
                "px-2 py-0.5 rounded text-xs border transition-all",
                strokeWidth === w.value
                  ? "border-[#10b981] bg-[#10b981]/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-muted-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Clear button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="ml-auto"
        >
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Effacer
        </Button>
      </div>

      {/* Validate button */}
      <Button
        type="button"
        className="w-full bg-[#10b981] text-[#09090b] hover:bg-[#10b981]/90 font-semibold"
        onClick={handleValidate}
        disabled={!hasDrawn}
      >
        Valider la signature
      </Button>

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Apercu de la signature :
          </p>
          <img
            src={preview}
            alt="Apercu de la signature"
            className="max-h-16 mx-auto"
          />
        </div>
      )}
    </div>
  );
}
