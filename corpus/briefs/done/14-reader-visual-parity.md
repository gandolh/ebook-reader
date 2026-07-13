# Task 14 — Make the PDF and EPUB reading views look the same

## Context
The two readers share the bottom-bar shell but their reading surfaces diverge, so
switching between a PDF and an EPUB doesn't feel like the same app:

- **EPUB** ([EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx#L662-L721))
  is a 3-row grid: a **running header row** (book title / chapter, fades with the
  chrome), a centered measure-capped column (`max-w-4xl`), then the bottom bar.
- **PDF** ([PdfReader.tsx](../../../apps/web/src/reader/pdf/PdfReader.tsx#L241-L271))
  is a plain `flex-col`: **no top header row**, a page centered on `reader-bg`
  with `py-6` + `shadow-lg`, then the bottom bar.

Requested by the user (2026-07-13): the PDF and EPUB reading views should look
the same. This is primarily about the shared **shell/frame** (header, column
framing, background, chrome fade), not the page content itself — a PDF page is a
fixed raster and an EPUB is reflowed text, so those stay different by nature.

## Dependencies / ordering
Do this **with or after [Brief 12](12-bottom-bar-clustering.md)** (bottom-bar
clustering) — they both touch reader chrome and 12 is the smaller, contained
piece.

## Constraint (load-bearing)
**Must conform to the enforced "Quiet Paper" design system**
([wiki/design.md](../../wiki/design.md), D27): theme tokens only (no raw hex),
the Playfair / Source Serif 4 / Inter type roles, the radii/elevation/spacing
rules, sparing accent. Run its conformance checklist before calling this done.

## Files you OWN
- [apps/web/src/reader/pdf/PdfReader.tsx](../../../apps/web/src/reader/pdf/PdfReader.tsx) — adopt the EPUB frame: a running header row (book title / page label) that fades with `chromeVisible`, the same centered column framing + background treatment, same paddings.
- Possibly a small shared frame/header component in [apps/web/src/reader/chrome/](../../../apps/web/src/reader/chrome/) if the header is worth extracting so both readers use one implementation (preferred over duplicating).
- [apps/web/src/reader/epub/EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx) — only if extracting the shared header, to consume it.

## Files you must NOT touch
- Page-rendering internals that must differ (react-pdf `<Page>` sizing/zoom, epub.js `flow`/`spread`, the page-map machinery).
- The invert-dark PDF hack and EPUB theming — theming parity is out of scope here (PDF can't be recolored; that's a separate decision).

## What to do
1. Decide the shared shell: a top running-header row + centered column + background, matching EPUB. Extract a `ReaderFrame`/`ReaderHeader` if it reduces duplication; otherwise mirror the markup faithfully.
2. Give the PDF a running header (book title; optionally "Page N" mirrored from the bottom badge) that fades with the chrome exactly like EPUB's.
3. Align column max-width, padding, and background so a PDF page and an EPUB column sit in visually identical frames.
4. Keep auto-hide chrome behavior identical across both.
5. Run the design.md conformance checklist.

## Acceptance
- Opening a PDF and an EPUB shows the same frame: same header treatment, same column framing, same background, same chrome fade — only the page content differs.
- No raw hex in components; tokens + type roles per design.md.
- `npm run typecheck` clean; side-by-side visual check of a PDF and an EPUB fixture at desktop + narrow widths.

## Outcome (2026-07-13) — done

Shipped. Extracted a shared `ReaderHeader` (chrome/) — running title/detail row that fades with `chromeVisible` — and restructured `PdfReader` to EPUB's exact 3-row grid frame (header / centered max-w-4xl column / toolbar) with matching background + padding. PDF header title = `file.name` (no PDF metadata title in code); detail = current outline section. `containerRef` moved onto the capped column so fit-width measures the same box (zoom formula unchanged). design.md D27 conformance verified by the cleanup finder (tokens only, correct type roles). Per-format TOC (EPUB docked sidebar vs PDF overlay drawer) intentionally left as-is. Typecheck clean.
