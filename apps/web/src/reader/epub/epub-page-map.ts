import type { Rendition } from "epubjs";

/**
 * Accurate, book-wide page numbering for reflowable EPUB (research: option 3).
 *
 * A reflowable book has no intrinsic pages — a "page" is `sectionWidth /
 * columnWidth` computed only AFTER a chapter is laid out. epub.js exposes that
 * per-chapter count as `currentLocation().start.displayed.total`, but it resets
 * at every chapter boundary. To get a smooth, book-wide "Page N / M" that ticks
 * by exactly 1 per screen turn, we pre-paginate every spine item and build a
 * prefix sum of per-chapter page counts.
 *
 * Crucially we walk the SAME rendition the reader will use, not a separate
 * hidden one: a hidden rendition whose pixel width differs by even 1px can
 * report a different page count for a section (epub.js #274), which would make
 * the counter jump at chapter boundaries. Same rendition → offsets and the live
 * `displayed.page` share one layout → guaranteed consistency.
 *
 * The walk moves the rendition through every section, so callers MUST run it
 * behind a loading veil and (for a mid-read recompute) it restores the position
 * it started from when done.
 */

export interface EpubPageMap {
  /** Book-wide page count before spine item `i`, indexed by spine index. */
  offsets: number[];
  /** Per spine index: that chapter's rendered page count (≥ 1). */
  counts: number[];
  /** Total rendered pages across the whole book at the current layout. */
  total: number;
}

interface DisplayedLoc {
  start?: {
    index?: number;
    cfi?: string;
    displayed?: { page?: number; total?: number };
  };
}

function readLoc(rendition: Rendition): DisplayedLoc | null {
  try {
    // The default (paginated) manager returns this synchronously.
    return rendition.currentLocation() as unknown as DisplayedLoc;
  } catch {
    return null;
  }
}

/** Current column/stage width, read loosely from the manager's layout. */
function stageWidth(rendition: Rendition): number {
  const m = rendition as unknown as {
    manager?: {
      layout?: { width?: number; pageWidth?: number };
      stage?: { stageSize?: () => { width?: number } };
    };
  };
  return (
    m.manager?.layout?.pageWidth ??
    m.manager?.layout?.width ??
    m.manager?.stage?.stageSize?.()?.width ??
    -1
  );
}

const raf = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 40)));

/**
 * Wait until the reader's column width stops changing before counting pages.
 * On mount the column animates/settles to its final (max-width-capped) size;
 * counting too early measures a transient width and yields a wrong total that
 * then "jumps" when corrected. Poll until two consecutive frames agree.
 */
async function waitForStableLayout(rendition: Rendition): Promise<void> {
  let last = -1;
  for (let i = 0; i < 25; i++) {
    const w = stageWidth(rendition);
    if (w > 0 && w === last) return;
    last = w;
    await raf();
  }
}

/**
 * Pre-paginate the whole book and build the page map. Restores the rendition to
 * wherever it started (so a mid-read recompute keeps the reader's place).
 *
 * @param onProgress reports `(done, total)` sections as the walk proceeds.
 */
export async function buildPageMap(
  rendition: Rendition,
  onProgress?: (done: number, total: number) => void,
): Promise<EpubPageMap> {
  const book = rendition.book;
  await book.ready;
  // Let the column reach its final width first, or the counts (and total) will
  // be measured against a transient layout and jump once when corrected.
  await waitForStableLayout(rendition);

  // `spineItems` exists at runtime but isn't in epub.js's TS types.
  const spine = book.spine as unknown as {
    spineItems?: Array<{ index?: number; href: string }>;
  };
  const items = spine.spineItems ?? [];
  const restoreCfi = readLoc(rendition)?.start?.cfi ?? null;

  const counts: number[] = [];
  let maxIndex = 0;

  for (let i = 0; i < items.length; i++) {
    const section = items[i];
    const idx = typeof section.index === "number" ? section.index : i;
    maxIndex = Math.max(maxIndex, idx);

    await rendition.display(section.href);
    const total = readLoc(rendition)?.start?.displayed?.total;
    counts[idx] = typeof total === "number" && total > 0 ? total : 1;

    onProgress?.(i + 1, items.length);
  }

  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i <= maxIndex; i++) {
    offsets[i] = acc;
    acc += counts[i] ?? 1;
  }

  // Return to where we started (chapter 0 on first open; the reader's spot on a
  // mid-read recompute). Best-effort — a failed restore just lands at start.
  try {
    if (restoreCfi) await rendition.display(restoreCfi);
    else if (items[0]) await rendition.display(items[0].href);
  } catch {
    /* restore is best-effort */
  }

  return { offsets, counts, total: Math.max(acc, 1) };
}

/** Book-wide page number for a live location, given the page map (clamped). */
export function bookPageFromLocation(
  rendition: Rendition,
  map: EpubPageMap,
): number | null {
  const loc = readLoc(rendition);
  const idx = loc?.start?.index;
  if (typeof idx !== "number") return null;
  const displayedPage = loc?.start?.displayed?.page ?? 1;
  const offset = map.offsets[idx] ?? 0;
  return Math.min(Math.max(offset + displayedPage, 1), map.total);
}
