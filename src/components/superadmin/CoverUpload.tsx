"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Device file upload for a game cover. Uploads the chosen image to the
 * `game-covers` Supabase bucket via /api/admin/games/upload-cover and reports
 * the resulting public URL through `onChange`. Falls back to the gradient when
 * no image is set.
 */
export function CoverUpload({
  value,
  gradient,
  onChange,
}: {
  value?: string;
  gradient: string;
  onChange: (url: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/games/upload-cover", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Upload failed.");
      onChange(j.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Preview / drop target */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={cn(
          "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-900/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          dragOver && "ring-2 ring-violet-500",
        )}
        aria-label="Upload cover image"
      >
        {value ? (
          <Image src={value} alt="Cover preview" fill sizes="80px" className="object-cover" />
        ) : (
          <span className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", gradient)}>
            <ImageIcon className="h-5 w-5 text-white/70" />
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </span>
        )}
      </button>

      {/* Controls */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {value ? "Replace image" : "Upload image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          PNG, JPG, WEBP or GIF · up to 5MB. Drag &amp; drop or click. The gradient is used when empty.
        </p>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
