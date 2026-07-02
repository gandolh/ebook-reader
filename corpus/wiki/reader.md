# Reader

The heart of the app. Two renderers (PDF, EPUB) sharing one **Kindle-style
chrome**. 100% client-side.

## Entry: smart uploader
One dropzone. Detect by extension/MIME (D13):
- **PDF** → open PDF reader.
- **EPUB** → fork: **Read** (native) or **Convert to PDF**.

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
Tailwind + Base UI (`@base-ui/react`) primitives: **Dialog/Drawer** (TOC,
settings sheet), **Popover** (settings), **Slider** (font size/zoom), **Tabs**
(theme picker), **Scroll Area**. Base UI is unstyled → bend toward a clean
Kindle look; state via `data-*` attrs maps to Tailwind variants.
