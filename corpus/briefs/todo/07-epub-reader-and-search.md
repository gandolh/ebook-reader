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
