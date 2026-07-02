# TP-02 — PDF reader

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).
Fixture: `testing_files/2603.16021v2.pdf` (arXiv paper, has outline + text layer).

## Goal
The PDF reader renders real documents and all chrome features work: paging,
zoom, TOC, search, themes, auto-hide.

## Cases
1. **Render** — first page renders legibly; progress indicator shows page 1 of N
   with correct N.
2. **Page nav** — next/prev buttons, ArrowRight/ArrowLeft keys; bounds respected
   (no page 0 / N+1).
3. **Jump to page** — direct page input (if present) goes to that page.
4. **Zoom** — zoom controls change render size; text stays sharp (re-render, not
   CSS scale).
5. **TOC** — drawer opens, lists the paper's outline; clicking an entry jumps to
   the right page; drawer closes.
6. **Search** — search a term known to be in the paper; result count sane;
   next/prev result navigates pages; highlights visible; Escape/clear exits.
7. **Themes** — light/sepia/dark apply to page surface + chrome.
8. **Auto-hide chrome** — toolbar hides when idle, returns on move/interaction.
9. **Back to home** — toolbar's home/back affordance returns to `/`.

## Pass criteria
All features operate on the real paper without red console errors; no blank or
garbled pages.
