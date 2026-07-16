import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { LibraryBook } from "@ebook-reader/shared";

import type { BookGroup } from "./grouping";

/**
 * Shelves view (brief 21 step 5, default). One horizontal shelf per group: a
 * quiet `label-caps` name + count above a single **non-wrapping** row of covers
 * standing on a hairline "plank" (`line-soft`). Long shelves scroll
 * horizontally — native scroll, keyboard-focusable, with a quiet right-edge
 * fade affordance shown only while the row actually overflows.
 *
 * Covers are rendered by the caller's `renderCover` (the same `CoverCard` the
 * flat gallery uses, so grouping never forks cover behavior); each is boxed to a
 * fixed width so `CoverCard`'s `w-full` cover resolves to a shelf tile.
 */
export function ShelfView({
  groups,
  renderCover,
}: {
  groups: BookGroup[];
  renderCover: (book: LibraryBook) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <Shelf key={group.key} group={group} renderCover={renderCover} />
      ))}
    </div>
  );
}

function Shelf({
  group,
  renderCover,
}: {
  group: BookGroup;
  renderCover: (book: LibraryBook) => ReactNode;
}) {
  const { ref, overflowing } = useOverflow();

  return (
    <section aria-label={group.label} className="flex flex-col gap-3">
      <h3 className="flex items-baseline gap-2 font-ui text-xs font-semibold tracking-[0.08em] text-ink-variant uppercase">
        {group.label}
        <span className="text-ink-variant/70">{group.books.length}</span>
      </h3>

      <div className="relative">
        <div
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label={`${group.label} shelf, ${group.books.length} books`}
          className="flex gap-6 overflow-x-auto pb-1 focus-visible:outline-2 focus-visible:outline-accent [scrollbar-width:thin]"
        >
          {group.books.map((book) => (
            <div key={book.id} className="w-28 shrink-0 sm:w-32">
              {renderCover(book)}
            </div>
          ))}
        </div>

        {/* Quiet overflow affordance: a right-edge fade to paper, only while the
            row overflows. Pointer-events-none so it never blocks a cover. */}
        {overflowing && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-paper to-transparent"
          />
        )}
      </div>

      {/* The plank: a hairline the covers stand on (their bottom-heavy shadow
          does the "standing" — design.md elevation). */}
      <div aria-hidden className="h-px w-full bg-line-soft" />
    </section>
  );
}

/**
 * Tracks whether a scroll container's content overflows its width, re-checking
 * on resize (covers loading, viewport changes). Drives the shelf's edge fade so
 * the affordance only appears when there's actually more to scroll to.
 */
function useOverflow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  return { ref, overflowing };
}
