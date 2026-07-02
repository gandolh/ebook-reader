/**
 * ─────────────────────────────────────────────────────────────────────────────
 * IN-BOOK SEARCH SEAM  (stub — brief 07 completes this)
 * ─────────────────────────────────────────────────────────────────────────────
 * In-book search IS in v1 (decisions.md D19), but per this brief's scope brief
 * 07 OWNS the shared search UI and implements search for BOTH formats. Brief 06
 * only guarantees the text layer is available so search is *possible* (the PDF
 * reader renders `<Page renderTextLayer />`, which produces selectable,
 * searchable DOM text; PDF.js `page.getTextContent()` is also available).
 *
 * This file defines the minimal, format-agnostic contract brief 07 will build
 * the search box + result navigation against. It is intentionally tiny and
 * unimplemented — do not add search logic here; wire it up in brief 07.
 */

/** A single match, with an opaque jump target the reader knows how to resolve. */
export interface SearchMatch {
  /** The matched snippet (for the results list). */
  excerpt: string;
  /** e.g. page number (PDF) or CFI (EPUB) — resolved by the reader. */
  target: unknown;
}

/**
 * Search provider each reader supplies to the (brief 07) shared search UI.
 * PDF implements this via PDF.js `getTextContent()` across pages; EPUB via
 * epub.js `book.search()`. Left unimplemented in brief 06 by design.
 */
export interface SearchProvider {
  search(query: string): Promise<SearchMatch[]>;
}
