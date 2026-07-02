import { getRouteApi, Link } from "@tanstack/react-router";

import { useReaderStore } from "../store/reader-store";
import { PdfReader } from "../reader/pdf";
import { EpubReader } from "../reader/epub";
import { useDevSampleFile } from "../reader/pdf/dev/use-dev-sample-file";
import { useDevSampleEpub } from "../reader/epub/dev/use-dev-sample-epub";

const routeApi = getRouteApi("/read");

/**
 * `/read` — the reader view. Reads the in-memory `File` handed over by the
 * uploader (brief 05, Zustand `loadedFile`) and mounts the matching renderer
 * behind the shared chrome. No persistence (D3): on a direct visit with no
 * loaded file we show a "go home" state so `/read` is still testable.
 *
 * Format routing: this brief (06) implements PDF. EPUB lands in brief 07, which
 * mounts its renderer here and REUSES the shared chrome (apps/web/src/reader/
 * chrome). The `format` search param stays the type-safe seam; the actual file
 * comes from the store.
 */
export function Read() {
  const { format, dev } = routeApi.useSearch();
  const loadedFile = useReaderStore((s) => s.loadedFile);
  const loadedFormat = useReaderStore((s) => s.loadedFormat);

  // Dev-only, opt-in (`?dev=1`) sample files so `/read` is testable without the
  // uploader. Both return null in production and when not enabled. The `format`
  // param picks which sample: `?format=epub&dev=1` loads the EPUB, otherwise PDF.
  const devWantsEpub = (loadedFormat ?? format) === "epub";
  const devPdf = useDevSampleFile(Boolean(dev) && !devWantsEpub);
  const devEpub = useDevSampleEpub(Boolean(dev) && devWantsEpub);
  const devFile = devWantsEpub ? devEpub : devPdf;

  const file = loadedFile ?? devFile;
  // Prefer the store's detected format; fall back to the URL param. When a dev
  // sample is in play, infer the format from which sample loaded.
  const effectiveFormat =
    loadedFormat ?? format ?? (devFile ? (devWantsEpub ? "epub" : "pdf") : null);

  if (!file) {
    return <NoFileState format={effectiveFormat} />;
  }

  if (effectiveFormat === "pdf") {
    return <PdfReader file={file} />;
  }

  if (effectiveFormat === "epub") {
    // Brief 07: the EPUB reader (react-reader) reuses this brief's shared chrome.
    return <EpubReader file={file} />;
  }

  return <NoFileState format={effectiveFormat} />;
}

function NoFileState({ format }: { format: string | null }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">No file loaded</h1>
      <p className="text-reader-fg/70">
        Nothing to read yet. Files live only in memory (no persistence — D3), so a
        direct visit or refresh has nothing to show{format ? ` for “${format}”` : ""}.
      </p>
      <Link
        to="/"
        className="w-fit rounded-md border border-reader-border bg-reader-surface px-4 py-2 text-sm font-medium"
      >
        Go to home to pick a file
      </Link>
    </main>
  );
}
