# Reader

The heart of the app. Two renderers (PDF, EPUB) sharing one **Kindle-style
chrome**. 100% client-side.

## Entry: library home (2026-07-07)
The home page (`/`) is a **persistent library** (D24), styled per
[design.md](design.md) ("Quiet Paper"). Layout (see
`design/stitch_extracted/screen.png`): header (theme toggle + icons), a dashed
**"Add to Library"** dropzone (upload → `POST /library`), then a **cover-card
gallery** (`GET /library`) with EPUB/PDF badges, title/author, and a 2px blue
progress bar. Missing cover → typographic fallback tile. Empty state reinforces
upload. Opening a card fetches `GET /library/:id/file` into the reader; progress
`PATCH`es back. Delete via a per-card overflow control.

Detection still by extension/MIME (D13). **Both formats open the reader
directly.** EPUB→PDF export lives in the EPUB reader's toolbar as a secondary
"Download as PDF" button (see conversion.md).

> Superseded: the old *one-step uploader* (drop → straight to `/read`, no
> persistence) is replaced by this library. The dropzone UX survives inside the
> library home.

## The "quiet paper" reading surface (2026-07-02 redesign)
The page is the interface (PRODUCT.md). EPUB renders as a **single centered,
measure-capped column** (`spread: none`). Orientation lives at the edges and
fades with the chrome: running header (book title / current chapter), footer
"chapter · %" button (opens TOC at the current chapter), and a **scrubbable
progress rail** along the bottom edge (chapter ticks in locations-space, hover
tooltip, click / **drag** / arrow-key seek — dragging previews the fill +
tooltip live and commits one seek on release; brief 08). Since brief 08 the
rail is shared chrome and the PDF reader mounts it too. Settings is a Kindle-style **"Aa" panel**:
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
| Progress indicator (% / page count) | ✅ | ✅ | EPUB = accurate book-wide pages (pre-paginated, see below) |
| Scrub rail (click / drag / arrow-key seek) | ✅ | ✅ | shared `ProgressRail` (brief 08); PDF ticks from outline |
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
  `chromeVisible`), `ProgressIndicator`, `ProgressRail` (bottom-edge scrub strip,
  moved here from `epub/` in brief 08: hover tooltip, chapter ticks,
  pointer-capture drag with live preview + commit-on-release, touch-safe),
  `TocDrawer` (Base UI Dialog panel; entries
  carry an opaque `target` the reader resolves), `SettingsPopover`, `SliderControl`,
  `ThemePicker` (Tabs → `theme`), `use-apply-theme` (`data-theme` → `--reader-*`).
- **`search-seam.ts`** — typed STUB (`SearchProvider`/`SearchMatch`); brief 07
  implements search for both formats against it (D19).

PDF reader in `apps/web/src/reader/pdf/`: `PdfReader`, `PdfControls`,
`use-pdf-outline`. Mounts the shared `ProgressRail` (brief 08): percent =
`currentPage / numPages`, ticks from top-level outline entries, seek =
`goToPage(round(pct × numPages))`. Worker via `pdfjs-dist/build/pdf.worker.min.mjs?url` (bundled).
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

## EPUB book-wide page count (2026-07-07, pre-pagination)
Reflowable EPUB has no intrinsic pages, so "Page N/M" is derived. **`epub-page-map.ts`**
pre-paginates every spine item **on the reader's own rendition** (not a hidden
one — a ±1px width mismatch would jump the count at chapter boundaries, epub.js
#274) after the column width settles, reading each chapter's
`currentLocation().start.displayed.total` and building a prefix sum. Book page =
`offset[section] + displayed.page` → ticks by exactly 1, book-wide total is
exact. The walk runs **behind a full loading veil** on open (the book isn't
shown until pages are counted) and is recomputed (debounced, veil, position
preserved) on font size/family/spacing/margin change + viewport resize — the
only inputs that change visual page counts. Char-based `locations` are retained
**only** for the % rail + seek + chapter ticks (they're layout-independent, so
the rail stays stable across font changes). Superseded: the old
locations-as-page-unit counter (stepped by 2, chunk-count "total"). PDF is
unchanged (true fixed pages).

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
