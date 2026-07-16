import { useRef, useState, type DragEvent } from "react";
import {
  detectFileType,
  EPUB_EXTENSIONS,
  EPUB_MIME_TYPES,
  MP3_EXTENSIONS,
  MP3_MIME_TYPES,
  MP4_EXTENSIONS,
  MP4_MIME_TYPES,
  PDF_EXTENSIONS,
  PDF_MIME_TYPES,
  WEBM_EXTENSIONS,
  WEBM_MIME_TYPES,
} from "@ebook-reader/shared";

/**
 * "Add to Library" dropzone (wiki/design.md): dashed soft border, centered
 * upload glyph, Playfair prompt, helper line, and the solid Ink "Upload"
 * button. Drag-drop OR click/button to browse. Validates every format the
 * library understands — books (PDF/EPUB), music (MP3), and video (MP4/WebM,
 * brief 23) — by ext/MIME (D13) before handing the file up; the parent does
 * the actual upload.
 *
 * Brief 20 item 4 (rendering side): `disabled` mutes the zone and swaps in a
 * "requires connection" state when the library is offline — upload is an
 * online-only action.
 *
 * Brief 23c widens the accept list + copy from books-only to the full set;
 * the shared extension/MIME tables (not a hardcoded string) are the source of
 * truth so this can never drift from `detectFileType`.
 */

const ACCEPT = [
  ...PDF_EXTENSIONS,
  ...EPUB_EXTENSIONS,
  ...MP3_EXTENSIONS,
  ...MP4_EXTENSIONS,
  ...WEBM_EXTENSIONS,
  ...PDF_MIME_TYPES,
  ...EPUB_MIME_TYPES,
  ...MP3_MIME_TYPES,
  ...MP4_MIME_TYPES,
  ...WEBM_MIME_TYPES,
].join(",");

const INVALID_TYPE_MESSAGE =
  "Unsupported file type. Please upload a book (PDF/EPUB), music (MP3), or video (MP4/WebM) file.";

export function UploadZone({
  onFile,
  busy,
  disabled = false,
}: {
  onFile: (file: File) => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(file: File) {
    setError(null);
    const type = detectFileType(file.name, file.type);
    if (type) {
      onFile(file);
    } else {
      setError(INVALID_TYPE_MESSAGE);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) accept(file);
  }

  return (
    <section aria-label="Add to library">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        aria-disabled={disabled}
        className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${
          disabled
            ? "border-line-soft/50 bg-paper-low/20 opacity-60"
            : dragActive
              ? "border-accent bg-accent/5"
              : "border-line-soft bg-paper-low/40"
        }`}
      >
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-paper-container">
          <UploadGlyph className="h-6 w-6 text-accent" />
        </span>

        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl font-bold text-ink">Add to Library</h2>
          <p className="text-ink-variant">
            {disabled
              ? "Uploading requires a connection."
              : "Drag & drop a book, MP3, or video (MP4/WebM), or click to browse"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
          title={disabled ? "Requires connection" : undefined}
          className="rounded bg-ink-fill px-6 py-2.5 text-sm font-semibold text-on-ink-fill transition hover:opacity-90 disabled:opacity-50"
        >
          {disabled ? "Requires connection" : busy ? "Uploading…" : "Upload a file"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
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
