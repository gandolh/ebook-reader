import { useState } from "react";
import type { LibraryBook } from "@ebook-reader/shared";

import { coverUrl } from "../lib/library-api";
import type { OfflineDownloadStatus } from "../lib/use-library";
import { OfflineToggle } from "./OfflineToggle";

/** Per-book offline download affordance (brief 20 item 2, rendering side). */
export interface CoverOfflineProps {
  state: OfflineDownloadStatus;
  progress: number | null | undefined;
  /** False while the library is serving cached offline rows (no network to download from). */
  canDownload: boolean;
  onDownload: () => void;
  onRemove: () => void;
}

/**
 * A single book in the library gallery (wiki/design.md "Cards (Book Covers)").
 * 2:3 portrait, 2px radius, bottom-heavy shadow so the book "stands on a
 * shelf". Format badge top-right; a thin blue progress bar along the bottom for
 * started books. Missing cover → a tinted tile with the title set in Playfair.
 *
 * Brief 20 adds the offline toggle top-left (`offline`, omitted entirely when
 * IndexedDB isn't supported) and gates the "Remove" library action behind
 * `deleteDisabled` while offline (removing is an API call, not a local op).
 */
export function CoverCard({
  book,
  onOpen,
  onDelete,
  deleteDisabled = false,
  offline,
}: {
  book: LibraryBook;
  onOpen: (book: LibraryBook) => void;
  onDelete: (book: LibraryBook) => void;
  deleteDisabled?: boolean;
  offline?: CoverOfflineProps;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = book.hasCover && !imgFailed;
  const progressPct = Math.round(book.progress * 100);

  return (
    <div className="group flex flex-col gap-3">
      {/* Wrapper carries the hover lift so the cover art AND the offline
          toggle move together; the toggle is a sibling (not nested inside
          the open-book button) to keep the DOM free of nested interactive
          elements. */}
      <div className="relative aspect-[2/3] w-full transition duration-200 group-hover:-translate-y-1">
        <button
          type="button"
          onClick={() => onOpen(book)}
          aria-label={`Open ${book.title}`}
          className="absolute inset-0 overflow-hidden rounded-(--radius-cover) bg-paper-container text-left shadow-[0_8px_16px_-6px_rgba(28,27,27,0.18)] ring-1 ring-line-soft/40 transition duration-200 group-hover:shadow-[0_14px_24px_-8px_rgba(28,27,27,0.28)] focus-visible:outline-2 focus-visible:outline-accent"
        >
          {showImage ? (
            <img
              src={coverUrl(book.id)}
              alt=""
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            // Typographic fallback tile (the "Dune"/"Design Systems" style).
            <span className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
              <BookGlyph className="h-8 w-8 text-ink-variant/50" />
              <span className="font-display text-lg leading-tight font-semibold text-ink">
                {book.title}
              </span>
            </span>
          )}

          {/* Format badge (design.md chips: label-caps, subtle scrim, no border). */}
          <span className="absolute top-2.5 right-2.5 rounded-(--radius-cover) bg-ink/55 px-2 py-1 text-[11px] leading-none font-semibold tracking-[0.08em] text-white uppercase backdrop-blur-sm">
            {book.format}
          </span>

          {/* Reading progress: thin 2px blue bar at the bottom edge. */}
          {progressPct > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink/10">
              <span
                className="block h-full bg-accent"
                style={{ width: `${progressPct}%` }}
              />
            </span>
          )}
        </button>

        {offline && (
          <OfflineToggle
            bookTitle={book.title}
            state={offline.state}
            progress={offline.progress}
            canDownload={offline.canDownload}
            onDownload={offline.onDownload}
            onRemove={offline.onRemove}
          />
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-base leading-snug font-semibold text-ink">
            {book.title}
          </p>
          {book.author && (
            <p className="truncate text-sm text-ink-variant">{book.author}</p>
          )}
        </div>

        {/* Per-card overflow → delete (design.md: quiet, appears on hover/focus). */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`More actions for ${book.title}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setMenuOpen(false)}
            className="grid h-9 w-9 place-items-center rounded text-ink-variant opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-paper-low focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent max-md:opacity-100"
          >
            <DotsGlyph className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute top-8 right-0 z-10 w-40 overflow-hidden rounded border border-line-soft bg-paper-raised shadow-lg">
              <button
                type="button"
                disabled={deleteDisabled}
                // onMouseDown (not onClick) so it fires before the trigger's onBlur closes the menu.
                onMouseDown={() => {
                  if (!deleteDisabled) onDelete(book);
                }}
                title={deleteDisabled ? "Removing requires a connection" : undefined}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  deleteDisabled
                    ? "cursor-not-allowed text-ink-variant/60"
                    : "text-danger hover:bg-danger-soft/50"
                }`}
              >
                {deleteDisabled ? "Remove (requires connection)" : "Remove"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v16H5.5A1.5 1.5 0 0 0 4 20.5z" strokeLinejoin="round" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v16h6.5a1.5 1.5 0 0 1 1.5 1.5z" strokeLinejoin="round" />
    </svg>
  );
}

function DotsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
