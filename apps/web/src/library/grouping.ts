import type { LibraryBook, LibraryGroup } from "@ebook-reader/shared";

/**
 * Grouping logic shared by both grouped views (brief 21 step 5). A `BookGroup`
 * is one shelf / one fanned stack: a stable `key` (also the `?g` drill-in
 * param), a display `label`, and the group's books in render order.
 *
 * Rules (identical for Shelves and Stacks, so the two views can never disagree
 * on membership or order):
 * - Group key = the **first** value: `author` (single-valued), `series`, or the
 *   first `subjects[]` entry. A missing/blank value → the "Unknown" group.
 * - Bucketing is on a trimmed + case-folded key, so "Science Fiction" and
 *   "science fiction" (or a trailing-space variant) land in the same group;
 *   the group's `label` is the first-encountered original spelling.
 * - The "Unknown" group always sorts **last**; all other groups are alphabetical
 *   (case-insensitive, locale-aware).
 * - Within a **series** group, books order by `seriesIndex` ascending with nulls
 *   last; every other group preserves the incoming order (the list is already
 *   sorted server-side by the active sort, so those groups "follow the sort").
 *
 * Tolerant of pre-brief-21 cached rows (offline fallback) whose `series` /
 * `subjects` fields predate the contract: absent values read as "Unknown".
 */

export interface BookGroup {
  /** Stable identity: the case-folded group value ("Unknown" for the catch-all). Used as `?g`. */
  key: string;
  /** Display label: the first-encountered original spelling for `key`. */
  label: string;
  /** The group's books, in render order (series → by index; else incoming order). */
  books: LibraryBook[];
}

/** The catch-all group's key/label for books missing the grouped value. */
export const UNKNOWN_GROUP = "Unknown";

/** The first non-empty grouping value for a book, or null when it has none. */
function groupValueOf(book: LibraryBook, groupBy: Exclude<LibraryGroup, "none">): string | null {
  if (groupBy === "author") {
    const author = book.author?.trim();
    return author ? author : null;
  }
  if (groupBy === "series") {
    const series = book.series?.trim();
    return series ? series : null;
  }
  // subject: first tag (multi-valued → one appearance per book).
  const first = book.subjects?.find((s) => s.trim().length > 0);
  return first ? first.trim() : null;
}

/**
 * Group `books` (already sorted by the active sort) by `groupBy`. Returns the
 * groups in render order. `groupBy === "none"` yields a single un-labelled group
 * of all books — callers branch on "none" before this and render the flat
 * gallery, so this is just a defensive identity.
 */
export function groupBooks(books: LibraryBook[], groupBy: LibraryGroup): BookGroup[] {
  if (groupBy === "none") {
    return [{ key: "", label: "", books }];
  }

  // Bucket on a trimmed + case-folded key so e.g. "Science Fiction" and
  // "science fiction " land in the same group; the group keeps the
  // first-encountered original spelling as its display label (and as the
  // `key`/`?g` identity — GroupedGallery's lookup and StackIndex's `onOpen`
  // both key off this same normalized string, so the round-trip stays coherent).
  const byKey = new Map<string, { label: string; books: LibraryBook[] }>();
  for (const book of books) {
    const raw = groupValueOf(book, groupBy);
    const label = raw ?? UNKNOWN_GROUP;
    const key = raw ? raw.toLocaleLowerCase() : UNKNOWN_GROUP;
    const bucket = byKey.get(key);
    if (bucket) bucket.books.push(book);
    else byKey.set(key, { label, books: [book] });
  }

  const groups: BookGroup[] = Array.from(byKey, ([key, { label, books: groupBooksList }]) => ({
    key,
    label,
    books:
      groupBy === "series" ? orderBySeriesIndex(groupBooksList) : groupBooksList,
  }));

  groups.sort((a, b) => {
    // "Unknown" always last.
    if (a.key === UNKNOWN_GROUP) return b.key === UNKNOWN_GROUP ? 0 : 1;
    if (b.key === UNKNOWN_GROUP) return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });

  return groups;
}

/** Order a series group by `seriesIndex` ascending, nulls last (stable otherwise). */
function orderBySeriesIndex(books: LibraryBook[]): LibraryBook[] {
  return books
    .map((book, i) => ({ book, i }))
    .sort((a, b) => {
      const ai = a.book.seriesIndex;
      const bi = b.book.seriesIndex;
      if (ai == null && bi == null) return a.i - b.i;
      if (ai == null) return 1;
      if (bi == null) return -1;
      return ai - bi || a.i - b.i;
    })
    .map((entry) => entry.book);
}
