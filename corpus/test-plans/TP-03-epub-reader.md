# TP-03 — EPUB reader

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).
Fixture: `testing_files/The Apothecary Diaries Volume 13 ….epub` (real commercial
EPUB with cover, images, TOC).

## Goal
The EPUB reader renders a real book reflowably and the chrome features work:
paging, TOC, search, themes, font settings.

## Cases
1. **Render** — book opens (cover or first chapter); no blank iframe.
2. **Page nav** — next/prev via buttons and arrow keys; progress indicator
   updates.
3. **TOC** — drawer lists the book's chapters; clicking jumps to the chapter.
4. **Search** — search a term from the book; results listed; clicking a result
   jumps to it; highlight visible.
5. **Themes** — light/sepia/dark restyle the book content (epub.js iframe), not
   just the chrome.
6. **Font settings** — font size (and family/line-height if present) visibly
   change the rendered text; layout reflows.
7. **Auto-hide chrome** — same behavior as PDF reader.
8. **Back to home** — returns to `/`.

## Pass criteria
Real book is readable end-to-end; every chrome control has a visible effect;
no red console errors.
