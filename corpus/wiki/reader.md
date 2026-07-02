# Reader

The heart of the app. Two renderers (PDF, EPUB) sharing one **Kindle-style
chrome**. 100% client-side.

## Entry: one-step uploader (2026-07-02)
One dropzone. Detect by extension/MIME (D13). **Both formats open the reader
directly — no fork screen.** EPUB→PDF export moved into the EPUB reader's
toolbar as a secondary "Download as PDF" button (see conversion.md).

## The "quiet paper" reading surface (2026-07-02 redesign)
The page is the interface (PRODUCT.md). EPUB renders as a **single centered,
measure-capped column** (`spread: none`). Orientation lives at the edges and
fades with the chrome: running header (book title / current chapter), footer
"chapter · %" button (opens TOC at the current chapter), and a **scrubbable
progress rail** along the bottom edge (chapter ticks in locations-space, hover
tooltip, click/arrow-key seek). Settings is a Kindle-style **"Aa" panel**:
theme swatches drawn as miniature pages, font specimens, A−/A+ steppers.
Loading is a skeleton page; TOC/search jumps crossfade via an overlay veil
(never opacity on the iframe's ancestors — Chromium raster staleness).

## Renderers
- **PDF** — `react-pdf` (PDF.js): lazy per-page rendering, text layer for
  selection/search. Fixed-layout.
- **EPUB** — `react-reader` (epub.js): reflowable text, native. Reflow is the
  Kindle magic.

## v1 feature set

| Feature | EPUB | PDF | Notes |
|---|---|---|---|
| Page nav (keys / click-zones / arrows) | ✅ | ✅ | core |
| Progress indicator (% / page count) | ✅ | ✅ | core |
| Table of contents drawer | ✅ | ⚠️ if outline | Base UI drawer |
| Auto-hiding chrome | ✅ | ✅ | Kindle feel |
| Themes (light / sepia / dark) | ✅ full | ⚠️ invert-only | reflow vs fixed |
| Font size / family / line-spacing / margins | ✅ | ❌ | EPUB-only |
| Zoom / fit-width | ❌ | ✅ | PDF-only |
| In-book search | ✅ | ✅ | text layer (D19) |
| **Bookmarks / highlights** | ❌ | ❌ | **excluded v1** (D18, no persistence) |
| Single-page vs continuous scroll | ✅ | ✅ | layout mode |

## Format-adaptive toolbar
The chrome is shared, but the toolbar's controls swap by format:
- EPUB → font controls (size/family/spacing/margins), full themes.
- PDF → zoom/fit, invert-only "dark" hack.

## State (Zustand, in-memory)
Current page/location, theme, font settings, chrome visibility, layout mode.
Resets on refresh (D3/D9).

## Styling
Tailwind + Base UI (`@base-ui/react`) primitives: **Dialog** (TOC side-panel +
settings sheet — chose Dialog over the heavier swipe Drawer), **Popover**
(settings), **Slider** (font size/zoom), **Tabs** (theme picker). Base UI is
unstyled → bend toward a clean Kindle look; state via `data-*` attrs maps to
Tailwind variants.

## Implementation map (built in brief 06)
Shared, format-agnostic chrome lives in `apps/web/src/reader/chrome/`:
- **`ReaderToolbar`** — the toolbar shell with the **format-adaptive seam**: slots
  `leftControls` / `formatControls` / `rightControls`. Each reader supplies its
  own `formatControls` (PDF = zoom/fit/invert; EPUB = font/theme). This is the
  reuse contract — brief 07 fills the slot, doesn't fork the toolbar.
- `PageNav` (arrows + left/right-third click-zones), `use-page-nav-keys`
  (Arrow/PageUp-Down/Space), `use-auto-hide-chrome` (idle-hide → Zustand
  `chromeVisible`), `ProgressIndicator`, `TocDrawer` (Base UI Dialog panel; entries
  carry an opaque `target` the reader resolves), `SettingsPopover`, `SliderControl`,
  `ThemePicker` (Tabs → `theme`), `use-apply-theme` (`data-theme` → `--reader-*`).
- **`search-seam.ts`** — typed STUB (`SearchProvider`/`SearchMatch`); brief 07
  implements search for both formats against it (D19).

PDF reader in `apps/web/src/reader/pdf/`: `PdfReader`, `PdfControls`,
`use-pdf-outline`. Worker via `pdfjs-dist/build/pdf.worker.min.mjs?url` (bundled).
**PDF TOC only when the doc has an outline.** Invert-dark = CSS `invert(1)
hue-rotate(180deg)` on the canvas (fixed layout can't be re-themed).
Store fields: `theme`, `fontSettings`, `currentLocation`, `chromeVisible`,
`layoutMode`, `zoom`, `loadedFile`/`loadedFormat`.

EPUB reader in `apps/web/src/reader/epub/` (built in brief 07, reuses the shared
chrome verbatim): `EpubReader` (react-reader; loads `file.arrayBuffer()`,
`locationChanged` → Zustand CFI, paginated; hides react-reader's built-in
arrows/TOC so shared `PageNav`/`TocDrawer` drive), `EpubControls` (fills the
`formatControls` seam), `EpubSettings` (font size/family/line-spacing/margins +
ThemePicker), `use-epub-theme` (applies **full** light/sepia/dark + fonts to the
epub.js *rendition* — real reflow theming, not PDF's invert hack), `use-epub-toc`
(flatten `book.navigation.toc`), `epub-search.ts` (spine walk → `section.find`).

## Search (built in brief 07, both formats)
Shared **`SearchPanel`** (`reader/chrome/`, right-anchored Base UI Dialog: query +
results + click-to-jump) is format-agnostic — it consumes a `SearchProvider`
(`search-seam.ts`) and reports the chosen `target` via `onJump`. Both readers mount
it with their own provider:
- **EPUB** (`epub-search.ts`): walk the spine, `section.load()` → `section.find()`
  → matches carry a CFI `target` + chapter label; jump = `rendition.display(cfi)`.
- **PDF** (`pdf-search.ts`): **search-on-demand** over the PDF.js text layer
  (`getTextContent()` per page, cached) — keeps open instant, pays cost only on
  search; matches carry page + snippet; jump = go to page. (Chosen over
  index-on-load.)
