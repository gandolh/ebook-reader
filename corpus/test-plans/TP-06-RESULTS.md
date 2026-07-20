# TP-06 RESULTS — 2026-07-20 (Atrium rebrand + Notes)

Live browser run (Playwright/Chromium, API :3001 + web :5173, user `bubu`).
Viewports exercised: monitor 1920×1080, laptop 1366×768, tablet 820×1180,
mobile 390×844. All three themes spot-checked.

## Verdict: PASS (3 bugs found + fixed live during the run)

### Identity (brief 24) — PASS
- Tab title, wordmark, PWA name all read **Atrium**; favicon is the arch mark;
  theme toggle middle glyph is the neutral contrast disc (no book). No
  "ebook-reader"/"Quiet Paper"/book-only copy in chrome.

### Per-type IA (brief 25) — PASS
- `/` → `/books`. Nav Books · Music · Videos · Notes with active state; deep
  links + refresh preserve the area. Books shows "Browse catalogs"; Music/
  Videos don't. Per-area headings, empty copy, upload labels all correct.
- Book cards 2:3; grids reflow 2→3→5 cols across breakpoints. (Music square /
  video 16:9 shapes are code-verified; not visually exercised — no sample
  media on the box, see Limitations.)

### Notes (brief 26) — PASS (after fixes)
- Create → editor; pen (smooth pressure line), highlighter (translucent),
  eraser (per-stroke), text box (place/type/move/delete), add page + flip,
  undo (3→2 strokes). Autosave + reload restores strokes/text (persistence
  confirmed). Delete from list → empty state; per-user model.
- **Bugs found + fixed live:** tool bar below the fold on desktop; strokes
  never committing (`getCoalescedEvents()` empty-array); giant-blob ink
  (normalized-coord degeneracy). Plus `setPointerCapture` hardened.

### Responsiveness / themes — PASS
- No horizontal body overflow at any of the 4 widths (books + notes editor).
- Header/nav wrap cleanly; notes tool bar reachable at the bottom on mobile
  (wraps to two rows); dark + warm themes render chrome legibly.

## Fixes applied this run
1. NoteEditor: page-nav → header, tool bar always `fixed` bottom (was `md:static`).
2. NoteEditor: `getCoalescedEvents()` empty-array fallback so move points aren't dropped.
3. NoteEditor: compute perfect-freehand geometry in a ×1000 viewBox space (ink scale).
4. NoteEditor: `setPointerCapture` wrapped in try/catch.
5. LibraryArea: empty areas show one area-specific empty state (dropped redundant hero dropzone).
6. library-routes cover route: `stat()` the thumbnail before streaming → a missing file is a clean 404 instead of a mid-stream **500** (found via network review; pre-existing, from the stale absolute-path rows). Residual `ERR_BLOCKED_BY_ORB` for those 2 dead rows is expected (a cross-origin non-image response for a genuinely-missing cover) and handled by the `<img onError>` fallback; the real cure is the stale-data cleanup (open-questions.md).

## Console / network review
- **Console: clean** — 0 errors, 0 warnings across the session (only a React DevTools info notice).
- **Network:** all app API calls 200 (`/auth/status`, `/library`, `/notes` CRUD, covers that exist). `/auth/status` fires twice on load (React StrictMode double-invoke, dev-only, harmless). Two cover requests fail for the pre-existing dead-path rows (now 404, was 500).

## Limitations / not exercised
- Music (square) + video (16:9) **populated** cards and in-app playback: no
  sample mp3/mp4 on the machine; shape logic is code-verified only.
- Existing 4 book rows point at a stale absolute path (pre-existing, see
  open-questions.md) — 2 covers load, 2 fall back; unrelated to these briefs.
- Notes offline editing (online-only v1, by design).
