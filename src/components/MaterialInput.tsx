import React, { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";

/**
 * Where course material comes in: pasted text, or lecture PDFs and slide decks.
 *
 * Extraction happens server-side and the result is appended to the same notes
 * field, so downstream everything is just text — the tutor never needs to know
 * whether a lesson came from a paste or a 60-slide deck.
 */

export interface AttachedFile {
  name: string;
  chars: number;
  warning?: string;
}

interface Props {
  notes: string;
  onNotesChange: (notes: string) => void;
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  rows?: number;
  onUseSample?: () => void;
}

export const MaterialInput: React.FC<Props> = ({
  notes,
  onNotesChange,
  files,
  onFilesChange,
  rows = 9,
  onUseSample,
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);

    let appended = notes;
    const added: AttachedFile[] = [];

    for (const file of Array.from(list)) {
      setBusy(file.name);
      try {
        const base64 = await toBase64(file);
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");

        if (data.text) {
          appended = appended
            ? `${appended}\n\n# ${file.name}\n${data.text}`
            : `# ${file.name}\n${data.text}`;
        }
        added.push({ name: file.name, chars: data.chars ?? 0, warning: data.warning });
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not read ${file.name}`);
      }
    }

    setBusy(null);
    onNotesChange(appended);
    onFilesChange([...files, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(name: string) {
    onFilesChange(files.filter((f) => f.name !== name));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label
          htmlFor="notes-field"
          className="text-xs font-bold uppercase tracking-wider text-[#7A837C]"
        >
          Your notes
        </label>
        <div className="flex items-center gap-3">
          {onUseSample && (
            <button
              type="button"
              onClick={onUseSample}
              className="text-[11px] font-bold text-[#5E7161] underline underline-offset-2"
            >
              use sample notes
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-full border border-[#E5E2D9] bg-white px-3 py-1 text-[11px] font-bold text-[#5E7161] transition-colors hover:bg-[#F0F4F0] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Reading {truncate(busy, 18)}…
              </>
            ) : (
              <>
                <Paperclip className="h-3 w-3" /> Add PDF or PPTX
              </>
            )}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.txt,.md"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <span
              key={f.name}
              title={f.warning}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                f.warning
                  ? "border-[#F0D194] bg-[#FFF8F0] text-[#D97706]"
                  : "border-[#E5E2D9] bg-[#F5F2EA] text-[#5E7161]"
              }`}
            >
              <FileText className="h-3 w-3" />
              <span className="font-bold">{truncate(f.name, 26)}</span>
              <span className="opacity-70">{f.chars.toLocaleString()} chars</span>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                aria-label={`Remove ${f.name}`}
                className="ml-0.5 opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-2 rounded-xl border border-[#E8C5B0] bg-[#FFF5F5] px-3 py-2 text-[11px] text-[#B85B56]">
          {error}
        </p>
      )}

      <textarea
        id="notes-field"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={rows}
        placeholder="Paste lecture notes, a chapter, a transcript — or attach a PDF or slide deck above."
        className="w-full resize-y rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-3 font-mono text-xs leading-relaxed outline-none focus:border-[#5E7161]"
      />
      <div className="mt-1 text-right text-[11px] text-[#7A837C]">
        {notes.trim().length.toLocaleString()} characters
      </div>
    </div>
  );
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
