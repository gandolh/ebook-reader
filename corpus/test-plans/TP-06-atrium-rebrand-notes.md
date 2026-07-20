# TP-06 — Atrium rebrand + Notes (briefs 24–26)

Browser test plan for the Atrium rebrand (identity + per-type IA + per-media
cards) and the new Notes tab. Run across four viewport widths; log findings in
RESULTS.md.

## Viewports
| Label | Size | Emulates |
|---|---|---|
| Monitor | 1920×1080 | Desktop external monitor |
| Laptop | 1366×768 | Laptop |
| Tablet | 820×1180 | iPad (portrait) |
| Mobile | 390×844 | iPhone 12/13/14 |

## Preconditions
- API on :3001, web on :5173, user `bubu`/`bubu`.
- Library has existing books (+ any music/video previously uploaded).

## Cases

### A. Identity (brief 24)
1. Tab title reads **Atrium**; favicon is the arch mark (not 📖).
2. Header wordmark reads **Atrium**; theme toggle middle icon is the neutral
   contrast disc (not a book).
3. No "ebook-reader" / "Quiet Paper" / book-only copy visible in chrome.

### B. Per-type IA (brief 25)
4. `/` redirects to `/books`. Nav shows Books · Music · Videos · Notes; active
   tab is underlined/accented.
5. Switching tabs changes the area heading + content; deep-linking `/music`,
   `/videos`, `/notes` works; refresh preserves the area.
6. Books area shows "Browse catalogs"; Music/Videos don't. Each area's empty
   state + upload label matches its media.
7. Grouping (Shelves/Stacks) + Sort present for Books & Music; Videos shows
   Sort only.

### C. Per-media card shapes (brief 25)
8. Book cards are 2:3 portrait; music cards are square (art fills); video cards
   are 16:9 landscape. Badges/duration/progress render correctly per shape.
9. Coverless tiles show the right glyph (book / music-note / play).
10. Continue strip (if present) uses the item's shape and correct verb
    (reading/listening/watching).

### D. Notes (brief 26)
11. Notes tab → list; "New note" creates a note and opens the editor.
12. Editor: draw with pen (smooth), highlighter (translucent), erase a stroke;
    place a text box, type, move it; add a page and flip between pages.
13. Undo/redo work. Reload the note → strokes/text/pages persist (autosave).
14. Delete a note from the list; per-user isolation (a second user sees none of
    the first's notes).

### E. Responsiveness (all viewports)
15. Header/nav wrap cleanly; no horizontal body scroll at any width.
16. Card grids reflow per breakpoint; nothing clipped or overlapping.
17. Notes tool bar is reachable/usable on mobile (bottom bar); drawing on touch
    doesn't scroll the page.
18. All three themes (light/warm/dark) render chrome legibly.
