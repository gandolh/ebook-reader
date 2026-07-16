---
title: Group library books using metadata
created: 2026-07-16
status: promoted
tags: [library, metadata, ui]
---

# Group library books using metadata

Let the library gallery be *grouped* by book metadata (author, series,
subject/genre), not just flat-sorted. Today the library only knows
`title` + `author` ([library-book.ts](../../packages/shared/src/library-book.ts))
and offers flat sorts (`recent | title | author`); there is no grouping and no
richer metadata is extracted at upload time.

## Context

**Answer to "can we?": yes** — the metadata is already inside the files; we just
don't extract or store it. Inline research findings (2026-07-16):

- **EPUB carries rich, standardized metadata** in the OPF (Dublin Core):
  `dc:creator` (author, multi-valued), `dc:subject` (genre/tags, multi-valued),
  `dc:publisher`, `dc:language`. Series has two conventions to support:
  - EPUB 2 / de-facto standard: `<meta name="calibre:series">` +
    `calibre:series_index` — what most tooling (Calibre, Kavita, KOReader)
    actually reads.
  - EPUB 3 native: `belongs-to-collection` with `collection-type: series` +
    `group-position` refinement.
  Sources: [Readium metadata parsing](https://readium.org/architecture/streamer/parser/metadata.html),
  [Kavita EPUB metadata guide](https://wiki.kavitareader.com/guides/metadata/epubs/),
  [w3c epub-specs #326 (series)](https://github.com/w3c/publ-epub-revision/issues/326),
  [KOReader #5892 (epub3 series)](https://github.com/koreader/koreader/issues/5892).
- **PDF metadata is much weaker**: the Info dictionary (`Author`, `Subject`,
  `Keywords`) plus optional XMP. pdf.js exposes both via `getMetadata()`, but
  the fields are frequently empty or wrong in the wild — treat PDF metadata as
  best-effort, fall back to "Ungrouped/Unknown". Sources:
  [GROBID PDF metadata guide](https://grobid.org/guides/pdf-metadata-extraction),
  [pdf.js #8180](https://github.com/mozilla/pdf.js/issues/8180).
- **Prior art for the UX**: Calibre's
  [virtual libraries](https://manual.calibre-ebook.com/virtual_libraries.html)
  (saved searches over metadata) and Kavita's series/collection grouping
  ([scanner docs](https://wiki.kavitareader.com/guides/scanner/epub/)) — both
  reduce to: extract metadata at import, then group/filter the gallery on it.
  Kavita's fallback chain (internal metadata → filename) is a good model for
  sparse files.

**Implementation sketch (for the future brief, not locked):**
1. Extract at upload time in `apps/api` (schema migration: `series`,
   `seriesIndex`, `subjects[]` on the book row; extend the D24 wire contract).
   Calibre is already a host dependency — `ebook-meta` could do extraction, or
   parse the OPF/PDF Info directly in Node.
2. Backfill existing rows (re-scan stored files once).
3. UI: a "Group by" control next to the existing "Sort by" (none / author /
   series / subject), rendering section headers in the gallery. Must conform to
   Quiet Paper ([design.md](../wiki/design.md), D27) — grouping is summoned
   organization, not dashboard chrome.

## Acceptance

Not specified yet — capture-stage. Open questions for the grill: which group
keys matter to the owner (author? series? subject?), whether PDFs are in scope
for grouping or land in "Unknown", and whether groups also filter (Calibre-style
virtual library) or only visually section the gallery.

> Promoted to [briefs/done/21-group-library-by-metadata.md](../briefs/done/21-group-library-by-metadata.md)
> (2026-07-16) after grilling: all three keys (author/series/subject), PDFs
> best-effort, first-value-only for multi-valued fields. Display treatment
> finalized same day via two mockup artifacts: **Shelves (default) ⇄ Stacks
> (drill-in) behind a View toggle**, replacing the grill's initial
> section-headers pick.
