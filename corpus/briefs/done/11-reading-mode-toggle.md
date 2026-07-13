# Task 11 — Reading bottom bar: paged ⇄ scrollable mode toggle

## Context
Both readers are paginated today: the PDF renders exactly one `<Page>` at a time
([apps/web/src/reader/pdf/PdfReader.tsx](../../../apps/web/src/reader/pdf/PdfReader.tsx#L261-L268))
and the EPUB uses `epubOptions={{ flow: "paginated", spread: "none" }}`
([apps/web/src/reader/epub/EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx#L705)).
We want a toggle button in the shared reader bottom bar that switches the
current reader into a **continuous scroll** mode (all content flows vertically,
the container scrolls) and back to single-page-per-view.

Requested by the user (2026-07-13).

## Files you OWN
- [apps/web/src/store/reader-store.ts](../../../apps/web/src/store/reader-store.ts) — add `pageMode: "paged" | "scroll"` + a setter/toggle (persist it the same way other reader prefs are handled).
- A new shared toggle control, e.g. `apps/web/src/reader/chrome/PageModeToggle.tsx`, exported from [apps/web/src/reader/chrome/index.ts](../../../apps/web/src/reader/chrome/index.ts).
- [apps/web/src/reader/pdf/PdfReader.tsx](../../../apps/web/src/reader/pdf/PdfReader.tsx) — render a continuous, scrollable list of pages when `pageMode === "scroll"` (ideally windowed/lazy so a large PDF doesn't mount every page at once); keep the single-`<Page>` path for `"paged"`.
- [apps/web/src/reader/epub/EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx) — pass `flow: pageMode === "scroll" ? "scrolled-doc" : "paginated"` to `epubOptions`.
- Wire the toggle into the bottom bar via the `formatControls` (or a shared) slot in both readers.

## Files you must NOT touch
- The `ReaderToolbar` shell contract ([ReaderToolbar.tsx](../../../apps/web/src/reader/chrome/ReaderToolbar.tsx)) — it must stay format-agnostic (no PDF/EPUB branching). The toggle is a slot-supplied control.
- Progress/resume persistence semantics (per-user locator) — mode switching must not corrupt the saved position.

## What to do
1. Add `pageMode` state + toggle to the reader store; default `"paged"`.
2. Build a `PageModeToggle` using `ToolbarButton` (paged icon ⇄ scroll icon, `aria-pressed`, clear label).
3. **EPUB:** switch `epubOptions.flow`. Changing flow forces epub.js to re-render — verify the resume CFI still displays and the page-map / % rail behave (scroll mode may make "Page N/M" meaningless; decide: hide the page badge and show only % in scroll mode, or keep it — document the choice).
4. **PDF:** in scroll mode render pages sequentially in the existing `overflow-auto` container; keep zoom/fit working; keep `currentLocation` synced to the page nearest the top of the viewport (IntersectionObserver) so resume + the progress rail still track. Prefer a windowed render for large books.
5. Keep `usePageNavKeys` sensible in scroll mode (arrows can scroll or be no-ops — document).

## Acceptance
- A visible toggle in the bottom bar flips each reader between single-page and continuous-scroll, persists across reload, and is independent per format if that's cleaner.
- EPUB scroll mode reflows vertically; PDF scroll mode shows consecutive pages you can scroll through.
- Resume position and the progress rail/% stay correct after toggling and after reload.
- `npm run typecheck` clean; manual check on both a PDF and an EPUB fixture.

## Outcome (2026-07-13) — done

Shipped via plan-split-dispatch. Added `pageMode: "paged"|"scroll"` (localStorage-persisted) to the store + a shared `PageModeToggle` in both readers' middle toolbar cluster. PDF scroll = windowed multi-page render ([-2,+3] of the top page mount real canvases) with an IntersectionObserver syncing the top page to `currentLocation`; EPUB scroll = `flow: "scrolled-doc"` via a `key={flow}` remount, with the discrete page field replaced by a %-only chip. Keyboard nav scrolls one page per arrow. Review caught + fixed two real bugs: (1) the `PageNav` tap-to-flip edge zones stayed live in scroll mode (hijacked clicks/selection) — now rendered only in paged mode; (2) deep-page resume in scroll mode was corrupted when `pageAspect` resolved late and reflowed placeholder heights — the observer is now suppressed across that reflow. Typecheck + build clean.
