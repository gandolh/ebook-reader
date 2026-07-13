# Task 16 — Reduce EPUB open cost (double-parse + eager page-map/locations walk)

## Context (code-level, 2026-07-13)
Opening an EPUB does a lot of redundant CPU + memory work up front. In
[apps/web/src/reader/epub/EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx):

1. **The file is parsed twice.** `react-reader` parses the in-memory
   `ArrayBuffer` (`data`, [L229-L256](../../../apps/web/src/reader/epub/EpubReader.tsx#L229-L256)),
   and separately `buildPageMapDetached` reads a **fresh** `file.arrayBuffer()`
   and parses a **second throwaway `Book`** to walk every spine item off-screen
   ([L159-L187](../../../apps/web/src/reader/epub/EpubReader.tsx#L159-L187)). For
   the 24 MB test EPUB that's two full parses + a full-book pagination walk on
   open, and two 24 MB buffers resident at once.
2. **`locations.generate(1000)`** ([L308-L316](../../../apps/web/src/reader/epub/EpubReader.tsx#L308-L316))
   walks the whole book again to build char-locations for the % rail.
3. Both run **eagerly on every open**, even though the reader is usable before
   either finishes (the code already acknowledges this — the badge just waits).

The page-map exists to show an accurate "Page N / M" and enable exact page jumps
(brief 08). That's real value, but the cost profile deserves a measured pass.

## Files you OWN
- [apps/web/src/reader/epub/EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx)
- [apps/web/src/reader/epub/epub-page-map.ts](../../../apps/web/src/reader/epub/epub-page-map.ts)

## Files you must NOT touch
- The progress-sync / resume-locator contract — accuracy of resume + the % rail must not regress.
- The shared chrome components.

## What to do (measure first)
1. **Measure the open cost** before changing anything: instrument (or trace) the
   time from file-in-memory to (a) first render, (b) page-map ready, (c)
   locations ready, on the 24 MB EPUB. Record the numbers — this brief is only
   worth doing if the walk is actually a material chunk of open time.
2. Then pick the wins the measurement justifies, e.g.:
   - **Cache the page map + locations** keyed by book id (they're layout-
     dependent, so key by book + stage size + font settings) so re-opening the
     same book skips the walk.
   - **Avoid the second full buffer**: if epub.js can share the parsed book /
     bytes rather than re-reading `file.arrayBuffer()`, do so; otherwise release
     the first buffer once handed to epub.js.
   - **Defer / lower priority**: the reader is already usable before the walk —
     ensure the walk never blocks input, and consider `requestIdleCallback`.
   - Consider a cheaper locations resolution than 1000 if the rail tolerates it.
3. Re-measure and record the delta.

## Acceptance
- Documented before/after open-time numbers for the 24 MB EPUB.
- No regression in resume accuracy, the % rail, or exact page-jump (brief 08).
- Re-opening a recently-opened EPUB is measurably faster (cache hit) if caching is chosen.
- `npm run typecheck` clean.

## Outcome (2026-07-13) — done

Shipped (measure-first, live). Instrumented the 24 MB EPUB open: the two full-book walks (page-map ~2.8 s, `locations.generate(1000)` ~4.7 s) run seconds AFTER the reader is visible, thrashing the main thread, and re-ran in full on every re-open. Fixes: cache `locations` (save/load, keyed by book identity) and the page-map (module-level bounded LRU, keyed by identity + font settings + stage size), and skip the page-map walk entirely in scroll mode. **Same-book re-open: locations 4711→66 ms, page-map 2814→376 ms, reader-visible 559→335 ms.** Cold first-open unchanged (nothing cached yet). No regression to resume / % rail / exact page-jump / scroll mode (verified in-browser). Review fixes: identity now includes `lastModified` (wrong-book collision), page-map key uses `toFixed(1)` stage size (stale-map on sub-pixel diff), and a cancellation guard on `locations.generate` (mode-toggle double-walk). Follow-up: a durable cross-session cache (IndexedDB) would extend the win to first-open-after-reload. Typecheck clean.
