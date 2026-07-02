import { useNavigate } from "@tanstack/react-router";
import { useRef, useState, type DragEvent } from "react";
import { detectFileType, SUPPORTED_FORMATS, type Format } from "@ebook-reader/shared";

import { useReaderStore } from "../store/reader-store";

/**
 * `/` — the uploader. ONE step: drop (or pick) a PDF or EPUB and you're
 * reading. No fork screens — EPUBs open natively in the reader, where
 * "Download as PDF" lives as a secondary toolbar action (the conversion is an
 * export utility, never the primary path — D1).
 */

type Stage = { kind: "idle" } | { kind: "error"; message: string };

const INVALID_TYPE_MESSAGE = `Unsupported file type. Please upload a ${SUPPORTED_FORMATS.join(" or ")} file.`;

export function Home() {
  const navigate = useNavigate();
  const setLoadedFile = useReaderStore((state) => state.setLoadedFile);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function goToReader(file: File, format: Format) {
    setLoadedFile(file, format);
    void navigate({ to: "/read", search: { format } });
  }

  function handleFile(file: File) {
    const type = detectFileType(file.name, file.type);

    if (type === "pdf" || type === "epub") {
      goToReader(file, type);
      return;
    }

    setStage({ kind: "error", message: INVALID_TYPE_MESSAGE });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleBrowseChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (file) handleFile(file);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">ebook-reader</h1>
      <p className="text-reader-fg/70">Drop a PDF or EPUB and start reading.</p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors ${
          isDragActive
            ? "border-reader-accent bg-reader-accent/5"
            : "border-reader-border bg-reader-surface"
        }`}
      >
        <p className="text-base font-medium">Drag & drop a file here, or click to browse</p>
        <p className="text-sm text-reader-fg/60">
          Supported formats: {SUPPORTED_FORMATS.join(", ")}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          onChange={handleBrowseChange}
          className="hidden"
        />
      </div>

      {stage.kind === "error" && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {stage.message}
        </p>
      )}

      <p className="text-xs text-reader-fg/60">
        Need a PDF copy of an EPUB? Open the book and use “Download as PDF” in the
        toolbar.
      </p>
    </main>
  );
}
