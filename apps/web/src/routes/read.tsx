import { useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { LibraryBook } from "@ebook-reader/shared";

import { useReaderStore } from "../store/reader-store";
import { coverUrl } from "../lib/library-api";
import { PdfReader } from "../reader/pdf";
import { EpubReader } from "../reader/epub";
import { useProgressSync } from "../lib/use-progress-sync";
import { useHydrateBook } from "../lib/use-hydrate-book";
import { useDevSampleFile } from "../reader/pdf/dev/use-dev-sample-file";
import { useDevSampleEpub } from "../reader/epub/dev/use-dev-sample-epub";

const routeApi = getRouteApi("/read");

/**
 * `/read` — the reader view. Reads the in-memory `File` handed over by the
 * library (Zustand `loadedFile`, set when a cover card is opened) and mounts
 * the matching renderer behind the shared chrome. The `File` lives only in
 * memory, so a direct visit / refresh with nothing loaded shows a "go to
 * library" state (the book itself is persisted server-side per D24 — reopen it
 * from the library home).
 *
 * Format routing: this brief (06) implements PDF. EPUB lands in brief 07, which
 * mounts its renderer here and REUSES the shared chrome (apps/web/src/reader/
 * chrome). The `format` search param stays the type-safe seam; the actual file
 * comes from the store.
 */
export function Read() {
  const { format, book, dev } = routeApi.useSearch();
  const loadedFile = useReaderStore((s) => s.loadedFile);
  const loadedFormat = useReaderStore((s) => s.loadedFormat);

  // Cover-card clicks navigate here immediately (brief 10); this hook is the
  // single download path for both that and refresh / direct visits (D24).
  const hydrate = useHydrateBook(book);

  // Persist coarse reading progress back to the library when the book came
  // from it (D24). No-op for dev samples / direct visits.
  useProgressSync();

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
    if (hydrate.status === "loading") {
      return <OpeningState book={hydrate.book} progress={hydrate.progress} />;
    }
    if (hydrate.status === "error") {
      return <OpeningErrorState book={hydrate.book} onRetry={hydrate.retry} />;
    }
    return <NoFileState format={effectiveFormat} notFound={hydrate.status === "not-found"} />;
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

function NoFileState({ format, notFound }: { format: string | null; notFound?: boolean }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="font-display text-2xl font-semibold">No book open</h1>
      <p className="text-reader-fg/70">
        {notFound
          ? "That book isn't in your library anymore — it may have been removed."
          : `Nothing to read yet. The open file lives only in memory, so a direct visit or refresh has nothing to show${format ? ` for “${format}”` : ""}. Your books are saved though — reopen one from your library.`}
      </p>
      <Link
        to="/"
        className="w-fit rounded-md border border-reader-border bg-reader-surface px-4 py-2 text-sm font-medium"
      >
        Go to your library
      </Link>
    </main>
  );
}

/**
 * The opening screen (brief 10): shown from the instant a cover is clicked
 * until the file is in memory. Cover + title identify what's opening; a
 * determinate accent bar tracks the download (the transfer is the wait — a
 * 24MB EPUB on a slow link is tens of seconds). Indeterminate → pulsing bar.
 */
function OpeningState({ book, progress }: { book: LibraryBook | null; progress: number | null }) {
  const pct = progress !== null ? Math.round(progress * 100) : null;
  return (
    <main className="grid min-h-screen place-items-center bg-reader-bg px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
        <BookCoverTile book={book} />
        <div className="flex w-full flex-col gap-3">
          <h1 className="font-display text-xl leading-snug font-semibold text-reader-fg">
            {book ? book.title : "Opening your book…"}
          </h1>
          <div
            role="progressbar"
            aria-label="Downloading book"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct ?? undefined}
            className="h-1 w-full overflow-hidden rounded-full bg-reader-border/60"
          >
            {pct !== null ? (
              <div
                className="h-full rounded-full bg-reader-accent transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            ) : (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-reader-accent" />
            )}
          </div>
          <p className="text-sm text-reader-fg/60">
            {pct !== null ? `Downloading… ${pct}%` : "Fetching from your library…"}
          </p>
        </div>
      </div>
    </main>
  );
}

/** Download failed (API offline, connection dropped). Today's silent failure
 * becomes an explicit state with a retry. */
function OpeningErrorState({ book, onRetry }: { book: LibraryBook | null; onRetry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-reader-bg px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
        <BookCoverTile book={book} dimmed />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-xl leading-snug font-semibold text-reader-fg">
            Couldn't open {book ? `“${book.title}”` : "your book"}
          </h1>
          <p className="text-sm text-reader-fg/60">
            The download didn't finish — the connection may have dropped.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-reader-accent px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-md border border-reader-border bg-reader-surface px-4 py-2 text-sm font-medium text-reader-fg"
          >
            Back to library
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Small 2:3 cover for the opening/error screens; typographic fallback tile
 * when the book has no cover, its cover fails to load (API down), or the row
 * isn't known yet. */
function BookCoverTile({ book, dimmed }: { book: LibraryBook | null; dimmed?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      className={`aspect-[2/3] w-28 overflow-hidden rounded-sm bg-reader-surface shadow-[0_8px_16px_-6px_rgba(28,27,27,0.25)] ring-1 ring-reader-border/50 ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      {book?.hasCover && !imgFailed ? (
        <img
          src={coverUrl(book.id)}
          alt=""
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center px-2 text-center font-display text-sm leading-tight font-semibold text-reader-fg/70">
          {book?.title ?? ""}
        </span>
      )}
    </div>
  );
}
