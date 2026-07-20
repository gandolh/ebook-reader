import { useState } from "react";
import type { LibraryBook } from "@ebook-reader/shared";

import { CoverArt } from "./CoverCard";

/**
 * The "Continue reading" resume strip — the first thing a returning reader
 * sees (library home hierarchy fix: for an established library the primary
 * job is *resume the last thing you were in*, not upload). One card: the most
 * recently opened, unfinished item — cover, title/author, a 2px accent
 * progress bar (design.md "Reading-progress bar"), and a Resume affordance.
 * The whole card is a single button (no nested interactive elements).
 *
 * Renders nothing when no candidate exists (empty library, nothing started,
 * or everything finished) — the shelf grid is the hero in that case.
 */
export function ContinueReading({
  book,
  onOpen,
}: {
  book: LibraryBook;
  onOpen: (book: LibraryBook) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const kind = book.kind ?? "book";
  const verb = kind === "audio" ? "listening" : kind === "video" ? "watching" : "reading";
  const pct = Math.round(book.progress * 100);
  // Thumb matches the item's card shape (brief 25): square art for music,
  // 16:9 for video, 2:3 for a book — with a wider box for the landscape video.
  const thumbAspect = kind === "audio" ? "aspect-square" : kind === "video" ? "aspect-video" : "aspect-[2/3]";
  const thumbWidth = kind === "video" ? "w-32 sm:w-40" : "w-20 sm:w-24";

  return (
    <section aria-label={`Continue ${verb}`}>
      <button
        type="button"
        onClick={() => onOpen(book)}
        aria-label={`Resume ${book.title} at ${pct}%`}
        className="group flex w-full items-stretch gap-5 rounded border border-line-soft/60 bg-paper-raised p-4 text-left shadow-[0_2px_8px_rgba(28,27,27,0.04)] transition hover:border-line-soft focus-visible:outline-2 focus-visible:outline-accent sm:gap-6 sm:p-5"
      >
        <span className={`relative block ${thumbAspect} ${thumbWidth} shrink-0 self-center overflow-hidden rounded-(--radius-cover) bg-paper-container shadow-[0_8px_16px_-6px_rgba(28,27,27,0.18)] ring-1 ring-line-soft/40`}>
          <CoverArt book={book} imgFailed={imgFailed} onImgError={() => setImgFailed(true)} />
        </span>

        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
          <span className="font-ui text-xs font-semibold tracking-[0.08em] text-ink-variant uppercase">
            Continue {verb}
          </span>
          <span className="line-clamp-2 font-display text-xl leading-snug font-semibold text-ink sm:text-2xl">
            {book.title}
          </span>
          {book.author && (
            <span className="truncate text-sm text-ink-variant">{book.author}</span>
          )}

          <span className="mt-2 flex items-center gap-3">
            <span className="h-0.5 max-w-72 flex-1 overflow-hidden rounded bg-ink/10">
              <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
            </span>
            <span className="font-ui text-xs text-ink-variant tabular-nums">{pct}%</span>
          </span>
        </span>

        {/* Visual affordance only — the card itself is the button. */}
        <span
          aria-hidden
          className="hidden self-center rounded bg-ink-fill px-5 py-2 font-ui text-sm font-semibold text-on-ink-fill transition group-hover:opacity-90 sm:block"
        >
          Resume
        </span>
      </button>
    </section>
  );
}

/**
 * Pick what the resume strip should show: the most recently opened item that
 * is actually in progress (0 < progress < 1). Finished and never-opened items
 * don't qualify. Independent of the gallery's sort order on purpose — sorting
 * the shelf by title shouldn't change what you were last reading.
 */
export function pickResumeBook(books: LibraryBook[]): LibraryBook | null {
  let best: LibraryBook | null = null;
  for (const b of books) {
    if (!b.lastOpenedAt || b.progress <= 0 || b.progress >= 1) continue;
    if (!best || b.lastOpenedAt > (best.lastOpenedAt ?? "")) best = b;
  }
  return best;
}
