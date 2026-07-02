# Task 06 — PDF reader + shared chrome

## Context
`react-pdf` viewer plus the **shared Kindle-style chrome** both readers use. Build
the chrome here; brief 07's EPUB reader reuses it. See [reader.md](../../wiki/reader.md).

## Files you OWN
- `apps/web/src` — the PDF reader view, the shared reader chrome components
  (toolbar, TOC drawer, progress, page-nav, settings), Zustand wiring for reader state

## Files you must NOT touch
- `apps/api/**`, `packages/shared/**`
- The uploader/home view (brief 05)

## What to do
1. **PDF renderer:** `react-pdf` — lazy per-page render, text layer on. Load from
   the in-memory file handed over by the uploader.
2. **Shared chrome (reusable across formats):**
   - Page nav: keyboard arrows, on-screen arrows, click-zones (left/right thirds).
   - Progress indicator (page count / %).
   - Auto-hiding chrome (hide on idle / reading, reveal on move/tap).
   - Settings surface via Base UI Popover/Dialog + Slider.
   - **Format-adaptive toolbar** hook: expose slots so PDF shows zoom/fit and
     invert-"dark", EPUB (brief 07) shows font controls/full themes.
3. **PDF-specific controls:** zoom / fit-width; invert-colors "dark" hack.
4. **TOC:** if the PDF exposes an outline, populate the Base UI drawer; else hide
   it for PDF (see [open-questions.md](../../wiki/open-questions.md)).
5. Wire reader state to Zustand (current page, zoom, theme, chrome visibility).

## Acceptance
- A PDF renders, pages navigate (keys/arrows/click-zones), progress updates.
- Zoom/fit and invert-dark work; chrome auto-hides and reveals.
- The shared chrome is factored so brief 07 can drop in EPUB controls.
- Typecheck clean.

---
## Outcome [2026-07-02]
Shipped. Shared chrome in `apps/web/src/reader/chrome/` (format-agnostic, no
renderer imports): `ReaderToolbar` (slot seam `leftControls`/`formatControls`/
`rightControls` — brief 07 fills `formatControls`), `PageNav` (arrows + third
click-zones), `use-page-nav-keys`, `use-auto-hide-chrome`, `ProgressIndicator`,
`TocDrawer` (Base UI Dialog side-panel — not the heavier Drawer primitive),
`SettingsPopover`, `SliderControl`, `ThemePicker` (Tabs), `use-apply-theme`
(`data-theme` → `--reader-*`), `search-seam.ts` (STUB — brief 07 completes, D19).
PDF reader in `apps/web/src/reader/pdf/`: `PdfReader`, `PdfControls` (zoom/fit/
invert-dark/TOC), `use-pdf-outline`, PDF.js worker via
`pdfjs-dist/build/pdf.worker.min.mjs?url` (bundled, no CDN), react-pdf TextLayer+
AnnotationLayer CSS imported. **TOC decision: PDF shows TOC only when an outline
exists.** Invert-dark = `filter: invert(1) hue-rotate(180deg)` on canvas only.
Store: additive `zoom`/`setZoom`. `read.tsx` mounts PdfReader / no-file fallback /
EPUB placeholder. Deps pinned: `react-pdf 10.4.1`, `pdfjs-dist 5.4.296`. Dev sample
double-gated (`import.meta.env.DEV` + `?dev=1`). Verified: typecheck ×3, Vite build
(worker emitted separately), module graph + worker + CSS + PDF asset all serve 200,
pdfjs Node-validated (3-page sample, outline→pages, text extract). **Not** pixel-
verified in a real browser (no headless browser installed).
