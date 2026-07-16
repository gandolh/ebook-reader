import type { CatalogBook } from "@ebook-reader/shared";

import { CoverFallback } from "../library/CoverFallback";
import { useImportBook } from "./use-catalog";

/**
 * A single Gutendex search result (brief 22b). Mirrors `CoverCard`'s 2:3
 * portrait / 2px radius / typographic-fallback treatment so the catalog reads
 * as the same visual family as the library grid, plus the "In library" badge
 * and the import action this surface adds.
 *
 * Each card owns its own `useImportBook` mutation so in-flight/success/error
 * state never leaks between cards — importing one book doesn't disturb the
 * "Add to library" affordance on any other.
 */
export function CatalogResultCard({
  book,
  inLibrary,
}: {
  book: CatalogBook;
  inLibrary: boolean;
}) {
  const importMutation = useImportBook();
  const author = book.authors[0] ?? "Unknown author";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-(--radius-cover) bg-paper-container shadow-[0_8px_16px_-6px_rgba(28,27,27,0.18)] ring-1 ring-line-soft/40">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <CoverFallback title={book.title} />
        )}

        {inLibrary && (
          <span className="absolute top-2.5 left-2.5 rounded-(--radius-cover) bg-ink/70 px-2 py-1 text-[11px] leading-none font-semibold tracking-[0.08em] text-white uppercase backdrop-blur-sm">
            In library
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="truncate font-display text-base leading-snug font-semibold text-ink">{book.title}</p>
        <p className="truncate text-sm text-ink-variant">{author}</p>
        <p className="text-xs font-semibold tracking-[0.08em] text-ink-variant/80 uppercase">
          {book.downloadCount.toLocaleString()} downloads
        </p>
      </div>

      <ImportAction book={book} inLibrary={inLibrary} mutation={importMutation} />
    </div>
  );
}

function ImportAction({
  book,
  inLibrary,
  mutation,
}: {
  book: CatalogBook;
  inLibrary: boolean;
  mutation: ReturnType<typeof useImportBook>;
}) {
  if (!book.epubAvailable) {
    return <p className="text-xs text-ink-variant/70">No EPUB available</p>;
  }

  if (mutation.isError) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-danger">Import failed.</p>
        <button
          type="button"
          onClick={() => mutation.mutate(book.id)}
          className="rounded border border-line-soft px-2 py-1 font-ui text-xs font-medium text-ink-variant transition hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return <p className="text-xs text-ink-variant">Added to library.</p>;
  }

  // Reimport stays allowed even when the badge already shows (brief: creates a
  // second card) — the action only ever reflects THIS mutation's own state.
  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(book.id)}
      className="w-fit rounded border border-line-soft px-3 py-1.5 font-ui text-xs font-medium text-ink-variant transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {mutation.isPending ? "Adding…" : inLibrary ? "Add again" : "Add to library"}
    </button>
  );
}
