"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface FileUploadProps {
  bucket: string;
  path: string;
  accept?: string;
  maxSize?: number; // in MB
  onUpload: (url: string) => void;
  onRemove?: () => void;
  currentUrl?: string | null;
  preview?: boolean;
  className?: string;
  label?: string;
}

export function FileUpload({
  bucket,
  path,
  accept = "image/*",
  maxSize = 10,
  onUpload,
  onRemove,
  currentUrl,
  preview = true,
  className,
  label = "Glissez un fichier ou cliquez pour sélectionner",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`Le fichier dépasse ${maxSize} Mo`);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "bin";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const fullPath = `${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fullPath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Simulate progress since Supabase JS doesn't expose upload progress
        setProgress(100);

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fullPath);

        onUpload(urlData.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'upload");
      } finally {
        setUploading(false);
      }
    },
    [bucket, path, maxSize, onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const isImage = currentUrl && /\.(jpg|jpeg|png|gif|webp)/i.test(currentUrl);

  return (
    <div className={cn("space-y-2", className)}>
      {currentUrl ? (
        <div className="relative rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            {preview && isImage ? (
              <img
                src={currentUrl}
                alt="Aperçu"
                className="h-16 w-24 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Fichier uploadé</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUrl.split("/").pop()}
              </p>
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors",
            dragActive
              ? "border-brand bg-brand/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
              <p className="text-sm text-muted-foreground">
                Upload en cours...
              </p>
              <div className="mt-2 h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {label}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Max {maxSize} Mo
              </p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
