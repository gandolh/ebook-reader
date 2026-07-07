import { useRef, useState, type DragEvent } from "react";
import { detectFileType, SUPPORTED_FORMATS } from "@ebook-reader/shared";

/**
 * "Add to Library" dropzone (wiki/design.md): dashed soft border, centered
 * upload glyph, Playfair prompt, helper line, and the solid Ink "Upload a book"
 * button. Drag-drop OR click/button to browse. Validates PDF/EPUB by ext/MIME
 * (D13) before handing the file up; the parent does the actual upload.
 */

const INVALID_TYPE_MESSAGE = `Unsupported file type. Please upload a ${SUPPORTED_FORMATS.join(" or ")} file.`;

export function UploadZone({
  onFile,
  busy,
}: {
  onFile: (file: File) => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(file: File) {
    setError(null);
    const type = detectFileType(file.name, file.type);
    if (type === "pdf" || type === "epub") {
      onFile(file);
    } else {
      setError(INVALID_TYPE_MESSAGE);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) accept(file);
  }

  return (
    <section aria-label="Add to library">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragActive ? "border-accent bg-accent/5" : "border-line-soft bg-paper-low/40"
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-paper-container">
          <UploadGlyph className="h-6 w-6 text-accent" />
        </span>

        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl font-bold text-ink">Add to Library</h2>
          <p className="text-ink-variant">
            Drag &amp; drop a PDF or EPUB, or click to browse
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded bg-ink-fill px-6 py-2.5 text-sm font-semibold text-on-ink-fill transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload a book"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-selecting the same file
            if (file) accept(file);
          }}
          className="hidden"
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded border border-danger/40 bg-danger-soft/50 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
    </svg>
  );
}
