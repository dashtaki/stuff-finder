import { type ChangeEvent, useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { shrinkImage } from "../lib/shrinkImage";

interface PhotoInputProps {
  value: Blob | null;
  onChange(value: Blob | null): void;
}

export function PhotoInput({ value, onChange }: PhotoInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewUrl = useObjectUrl(value);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await shrinkImage(file));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not process the photo";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Item preview"
          className="max-h-64 w-full rounded-xl object-cover"
        />
      )}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 px-4 py-3 text-center">
          {busy ? "Processing…" : value ? "Replace photo" : "Take photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Take photo"
            disabled={busy}
            onChange={handleFile}
          />
        </label>
        {value && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-3"
            onClick={() => onChange(null)}
          >
            Remove photo
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
