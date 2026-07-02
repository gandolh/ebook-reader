import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState, type DragEvent } from "react";
import { detectFileType, SUPPORTED_FORMATS, type Format } from "@ebook-reader/shared";

import { useReaderStore } from "../store/reader-store";
import { convertEpubToPdf, ConvertApiError } from "../lib/convert-api";

/**
 * `/` — smart uploader (brief 05, wiki/reader.md "Entry: smart uploader").
 *
 * One dropzone, classified via the shared `detectFileType` (ext/MIME only,
 * D13). PDFs route straight to the reader; EPUBs fork into "Read" (same
 * reader route) or "Convert to PDF" (server round trip via `/convert`,
 * D1 — export-only, no in-app read of the converted result).
 */

type Stage =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "epub-fork"; file: File }
  | { kind: "converted"; blob: Blob; filename: string };

const INVALID_TYPE_MESSAGE = `Unsupported file type. Please upload a ${SUPPORTED_FORMATS.join(" or ")} file.`;

function pdfFilenameFor(originalName: string): string {
  const base = originalName.replace(/\.epub$/i, "");
  return `${base}.pdf`;
}

export function Home() {
  const navigate = useNavigate();
  const setLoadedFile = useReaderStore((state) => state.setLoadedFile);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const convertMutation = useMutation({
    mutationFn: (file: File) => convertEpubToPdf(file),
  });

  function goToReader(file: File, format: Format) {
    setLoadedFile(file, format);
    void navigate({ to: "/read", search: { format } });
  }

  function handleFile(file: File) {
    convertMutation.reset();
    const type = detectFileType(file.name, file.type);

    if (type === "pdf") {
      goToReader(file, "pdf");
      return;
    }

    if (type === "epub") {
      setStage({ kind: "epub-fork", file });
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

  function resetToUploader() {
    convertMutation.reset();
    setStage({ kind: "idle" });
  }

  function handleConvert(file: File) {
    convertMutation.mutate(file, {
      onSuccess: (blob) => {
        setStage({ kind: "converted", blob, filename: pdfFilenameFor(file.name) });
      },
    });
  }

  function handleDownload() {
    if (stage.kind !== "converted") return;
    const url = URL.createObjectURL(stage.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = stage.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">ebook-reader</h1>
      <p className="text-reader-fg/70">
        Drop a PDF or EPUB to start reading, or convert an EPUB to PDF.
      </p>

      {stage.kind !== "epub-fork" && stage.kind !== "converted" && (
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
      )}

      {stage.kind === "error" && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {stage.message}
        </p>
      )}

      {stage.kind === "epub-fork" && (
        <div className="flex flex-col gap-4 rounded-lg border border-reader-border bg-reader-surface p-6">
          <p className="text-sm text-reader-fg/70">
            <span className="font-medium text-reader-fg">{stage.file.name}</span> is an EPUB.
            Read it natively, or convert it to a PDF to download.
          </p>

          {convertMutation.isPending ? (
            <p className="text-sm text-reader-fg/70" role="status">
              Converting&hellip; this can take a little while.
            </p>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => goToReader(stage.file, "epub")}
                className="rounded-md bg-reader-accent px-4 py-2 text-sm font-medium text-white"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => handleConvert(stage.file)}
                className="rounded-md border border-reader-border px-4 py-2 text-sm font-medium"
              >
                Convert to PDF
              </button>
              <button
                type="button"
                onClick={resetToUploader}
                className="rounded-md px-4 py-2 text-sm font-medium text-reader-fg/60"
              >
                Cancel
              </button>
            </div>
          )}

          {convertMutation.isError && (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {convertMutation.error instanceof ConvertApiError
                ? convertMutation.error.message
                : "Conversion failed."}
            </p>
          )}
        </div>
      )}

      {stage.kind === "converted" && (
        <div className="flex flex-col gap-4 rounded-lg border border-reader-border bg-reader-surface p-6">
          <p className="text-sm text-reader-fg/70">
            Converted to <span className="font-medium text-reader-fg">{stage.filename}</span>.
            Download it, or convert another file below.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md bg-reader-accent px-4 py-2 text-sm font-medium text-white"
            >
              Download
            </button>
            <button
              type="button"
              onClick={resetToUploader}
              className="rounded-md border border-reader-border px-4 py-2 text-sm font-medium"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
