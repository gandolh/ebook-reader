# Task 07 — EPUB reader + format-adaptive toolbar + search

## Context
Native EPUB reading via `react-reader` (epub.js) — the star experience — reusing
brief 06's shared chrome, plus in-book search for both formats. See
[reader.md](../../wiki/reader.md).

## Files you OWN
- `apps/web/src` — the EPUB reader view, EPUB toolbar controls, the search UI +
  logic (both formats)

## Files you must NOT touch
- `apps/api/**`, `packages/shared/**`
- The PDF renderer + shared-chrome internals from brief 06 (compose/reuse, don't
  rewrite)

## What to do
1. **EPUB renderer:** `react-reader` — reflowable, load from the in-memory file.
   Wire location changes to Zustand; render inside the shared chrome from brief 06.
2. **EPUB toolbar (format-adaptive):** font size (Base UI Slider), font family,
   line-spacing, margins; full themes (light/sepia/dark applied to epub.js).
3. **TOC:** populate the shared Base UI drawer from the EPUB spine/nav.
4. **In-book search (both formats):**
   - EPUB: search epub.js content, list results, jump to match.
   - PDF: search the PDF.js text layer — pick index-on-load vs search-on-demand
     (resolve the strategy noted in [open-questions.md](../../wiki/open-questions.md)).
   - Shared search UI in the chrome (input + results list + jump).
5. Confirm page nav / progress / auto-hide chrome all work for EPUB via the
   shared components.

## Acceptance
- An EPUB renders reflowably; font size/family/spacing/margins + themes work.
- TOC drawer navigates; page nav + progress + auto-hide work for EPUB.
- Search returns results and jumps to matches for **both** EPUB and PDF.
- Typecheck clean.

---
## Outcome [2026-07-02]
Shipped. `reader/epub/`: `EpubReader` (react-reader; `file.arrayBuffer()`,
`locationChanged`→Zustand CFI, paginated, shared chrome — react-reader's own
arrows/TOC hidden so shared `PageNav`/`TocDrawer` drive), `EpubControls` (fills
`formatControls`), `EpubSettings` (font size/family/spacing/margins + ThemePicker),
`use-epub-theme` (full light/sepia/dark on the epub.js **rendition** — real reflow
theming), `use-epub-toc` (flatten `book.navigation.toc`), `epub-search.ts`
(spine walk → `section.find` → CFI matches). Shared **`SearchPanel`** in
`reader/chrome/` (query + results + click-to-jump, format-agnostic, right-anchored
Base UI Dialog), wired into BOTH readers; PDF provider = `pdf/pdf-search.ts`
(**search-on-demand** over PDF.js text layer — instant open, per-page cache).
`read.tsx` mounts `EpubReader`; double-gated dev EPUB sample. Deps pinned:
`react-reader 2.0.15`, `epubjs 0.3.93`, `react-swipeable 7.0.2` (+ transitive
`jszip 3.10.1`). **No epubjs/Vite polyfill needed** — Vite 6 dep-optimizer handled
the CJS graph. epub.js `.d.ts` mistypes `section.find` return → cast. Verified:
typecheck ×3, Vite build (599 modules). Not pixel-verified (no headless browser).
