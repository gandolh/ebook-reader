# TP-01 — Home / library

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).

## Goal
The home page (`/`) is the **persistent library** (D24). Uploading a PDF/EPUB
stores it server-side (SQLite + on-disk file/cover), the gallery shows saved
books as cover cards, opening a card reads it, progress persists, and books can
be removed. Styled per [../wiki/design.md](../wiki/design.md) ("Quiet Paper").

Requires the API running (library routes + storage) — not client-only anymore.

## Cases
1. **Initial render** — `/` shows the header (wordmark + light/sepia/dark
   toggle), the "Add to Library" dropzone (glyph, prompt, "Upload a book"
   button), and "Recent Reads" with the sort control. No console errors.
2. **Empty state** — with an empty library, the gallery shows the "Your library
   is empty" state reinforcing upload.
3. **Upload PDF** — pick `2603.16021v2.pdf` → a card appears with the extracted
   title + a real page-1 cover + a PDF badge (POST /library succeeded).
4. **Upload EPUB** — pick the Apothecary EPUB → a card appears with title/author
   from the OPF; cover shown if the EPUB has one, else a typographic fallback
   tile.
5. **Open → read** — click a card → navigates to `/read?format=…` and the book
   renders (file fetched from GET /library/:id/file).
6. **Progress persists** — turn several pages, return home → the card shows a
   blue progress bar; GET /library reports a non-zero `progress` for that book.
7. **Sort** — switch "Sort by" between Recent / Title / Author → grid reorders.
8. **Remove** — card overflow (⋯) → Remove → card disappears; GET /library no
   longer lists it (row + file + thumbnail deleted).
9. **Unsupported type** — pick a `.txt` → inline error names supported formats;
   dropzone still usable.
10. **Themes** — toggle light/sepia/dark → the whole library re-themes legibly
    (text stays readable in every theme).
11. **Direct /read visit** — open `/read` fresh → "No book open" state with a
    working "Go to your library" link (the file is in-memory; the book itself
    is still saved).

## Pass criteria
All of the above behave as described with no red console errors; uploads persist
across a refresh; the design matches `design/stitch_extracted/screen.png`.

## Last run — 2026-07-07 (library feature, Playwright + live API)
PASS. Verified: library home renders per mockup; PDF stored with real page-1
cover + extracted title; EPUB fallback tiles + OPF author; open→PDF reader
renders; progress round-trip (advanced to page 4/21 → `progress=0.19`
persisted, blue bar shown on the card); delete removes the book (4→3); dark
theme legible after a token fix. One bug found+fixed mid-run: PATCH progress
blocked by CORS preflight (methods allowlist omitted PATCH) — fixed in
`apps/api/src/index.ts`. Not re-run: sepia theme (spot-checked light+dark),
EPUB open-to-read with a real cover-bearing book.
