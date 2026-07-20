# Handoff — Atrium rebrand + Notes tab (2026-07-20)

Snapshot of a session that rebranded **ebook-reader → Atrium**, split the app
into per-type media areas, added a **Notes** tab, and ran a live browser audit.
Everything below is **uncommitted** — the owner controls git.

---

## TL;DR

- The app is now **Atrium**, a personal media gallery (books / music / video)
  **+ a Notes tab**.
- Three briefs built and shipped: **24** (identity), **25** (per-type IA +
  per-media card shapes), **26** (Notes).
- Live UI audit (agent-browser + Playwright) across monitor/laptop/tablet/mobile
  + themes → **PASS**, with **6 real bugs found and fixed** along the way.
- **agent-browser** (Vercel) is now installed + registered as the project's
  virtual-browser driver, per the `ui-test-plans` skill.
- All workspaces typecheck; `apps/web` production build is clean.
- **Nothing committed.**

---

## What shipped (briefs 24–26, in `corpus/briefs/done/`)

### Brief 24 — Identity
Wordmark, `<title>`, PWA manifest (name/short_name/description), README, root
`package.json` name, and the `globals.css` design-system header all say
**Atrium**. Favicon → arch mark. Sepia theme glyph → neutral contrast disc.
**Kept** the internal npm scope `@ebook-reader/*`, the `--paper*`/`--reader-*`
token identifiers, and the `book`/`library` code nouns (renaming = large churn,
zero user value — see decision **D32**).

### Brief 25 — Per-type IA + per-media cards
- Routes `/books` `/music` `/videos` (+ `/` → `/books`); nav tabs in
  `AppHeader`; shared `LibraryArea` component per `kind`. Retired the in-header
  media-type filter + its localStorage pref.
- Card shapes: **book 2:3, music square, video 16:9**; per-kind fallback glyphs
  (book / music-note / play); per-area grids; Continue strip is kind-aware.
- `routes/home.tsx` deleted (replaced by `LibraryArea` + `routes/areas.tsx`).

### Brief 26 — Notes tab
- Shared `packages/shared/src/notes.ts` contract (normalized coords).
- API: `notes` table in `db.ts` (per-user, FK cascade) + `notes-routes.ts`
  (`registerNotesRoutes`, registered in `index.ts`; per-user via `authUser`).
- Web: `perfect-freehand@1.2.3` (pinned); `/notes` route + nav tab;
  `notes/` module — `NotesList`, `NoteEditor` (pen/highlighter/eraser/text
  tools, colors, thickness, paged, undo/redo, debounced autosave, mobile/stylus).
- Page sheet is a fixed light "paper" surface in all themes (ink legibility);
  chrome themes normally.

---

## Bugs found + fixed during the audit

| # | Where | Bug | Fix |
|---|---|---|---|
| 1 | `NoteEditor.tsx` | Tool bar + page-nav fell **below the fold** on desktop (`md:static` under an A4-tall sheet) | Page-nav → header; tool bar always `fixed` bottom |
| 2 | `NoteEditor.tsx` | Strokes **never committed** — `getCoalescedEvents()` returns `[]` for some events, dropping all move points | Empty-array fallback to the event itself |
| 3 | `NoteEditor.tsx` | Ink rendered as **giant blobs** — perfect-freehand degenerates on normalized 0..1 coords | Compute geometry in a ×1000 viewBox space (storage stays normalized) |
| 4 | `NoteEditor.tsx` | `setPointerCapture` could throw for synthetic/edge pointers | Wrapped in try/catch |
| 5 | `LibraryArea.tsx` | Empty area showed a redundant hero dropzone **and** an empty-state card | Uploader always ambient → one area-specific empty state |
| 6 | `library-routes.ts` | Cover route streamed `cover_path` without checking the file exists → **500** on missing thumbnail (surfaced as `ERR_BLOCKED_BY_ORB`) | `stat()` first → clean 404. Pre-existing (stale absolute-path rows) |
| 7 | `auth/LockScreen.tsx` | **Sign-in screen still said "ebook-reader"** (missed in brief 24; only visible on a fresh, unauthenticated profile) | → **Atrium**. Caught by agent-browser's fresh-profile snapshot |

All fixed and verified live. Typecheck + `apps/web` build clean after each.

---

## Console / network review (owner asked)

- **Console: clean** — 0 errors, 0 warnings across the session.
- **Network:** all app API calls 200 (`/auth/*`, `/library`, `/notes` CRUD,
  existing covers). Findings: cover **500 → 404** (fix #6 above); `/auth/status`
  fires twice on load (React StrictMode, **dev-only, harmless**); two covers
  fail for the pre-existing dead-path rows — the `<img onError>` fallback tile
  handles it. Residual `ERR_BLOCKED_BY_ORB` on those 2 rows is unavoidable
  (a cross-origin non-image response for a genuinely-missing cover); the real
  cure is the stale-data cleanup (see Known issues).

---

## Virtual-browser tooling (agent-browser)

Per the `ui-test-plans` skill, **agent-browser** is now the recommended driver:

- Installed globally: `npm i -g agent-browser` (bin reports 0.27.0).
- Registered as an MCP server (**local/project scope**, in
  `~/.claude.json` for this project):
  `claude mcp add agent-browser -- agent-browser mcp --tools core,network`.
- **⚠️ Activation:** MCP servers connect at **session start** — the
  agent-browser MCP tools are **available next session, not the one that
  registered them**. `claude mcp list` currently shows it after a first-run
  Chrome-for-Testing provisioning step.
- **First-run gotcha:** `agent-browser open` tries to **download
  Chrome-for-Testing**, which **stalled** in this sandbox (network-restricted /
  slow). Workaround used, which works reliably here: connect to the **system
  Chrome** over CDP —
  ```bash
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
    --headless=new --remote-debugging-port=9222 --user-data-dir=<temp-profile> about:blank &
  agent-browser connect 9222
  agent-browser navigate http://localhost:5173/books
  agent-browser snapshot -i          # lean, interactive-only
  ```
  This drove login (`fill @e4 bubu; fill @e5 bubu; click @e3`) and confirmed the
  authenticated app. Consider adding an executable/`connect` default so future
  runs skip the download.

---

## How to run / verify

```bash
npm install                 # (restores deps — vite-plugin-pwa was missing)
npm run seed -w @ebook-reader/api   # users bubu/bubu, teo/teo; runs notes migration
npm run dev                 # web :5173, api :3001  (login bubu/bubu)
# checks
npm run typecheck -w @ebook-reader/web
npm run typecheck -w @ebook-reader/api
npm run build -w @ebook-reader/web
```

Dev servers may still be running from this session (web :5173, api :3001).

---

## Corpus state (all updated, uncommitted)

- `briefs/done/24-atrium-brand.md`, `25-per-type-ia-and-cards.md`,
  `26-notes-tab.md` — with Outcome notes.
- `todos/rebrand-to-media-gallery.md`, `todos/notes-tab.md` → `status: promoted`.
- `wiki/status.md` (dashboard + briefs table), `wiki/overview.md` (Atrium),
  `wiki/decisions.md` (**D32** — the rebrand + Notes decision).
- `test-plans/TP-06-atrium-rebrand-notes.md` + `TP-06-RESULTS.md` (PASS).
- `log.md` — 2026-07-20 build+audit entry.
- Lint: clean except the pre-existing gitignored `playwright/` link warnings.

---

## Known issues / follow-ups (not done)

1. **Stale library data** — the 4 seed book rows store **absolute file paths**
   from an old checkout (`D:\home\gandolh\...`); 2 covers/files are unreadable
   here. Pre-existing (`wiki/open-questions.md`). Cure: reconcile paths / null
   `cover_path` when the file is missing (also silences the residual ORB noise).
2. **Music/video not visually exercised** — no sample MP3/MP4 on the box; the
   square/16:9 card shapes + playback are **code-verified only**. Upload real
   media to confirm.
3. **PWA icon PNGs** in `apps/web/public/` still the old 📖 art — regenerate
   for Atrium (only the inline SVG favicon was updated).
4. **`BASE_PATH` / deploy sub-path** is still `/ebook-reader/` — rename decision
   pending (PWA scope/precache migration cost). See the rebrand todo.
5. **Notes v1 follow-ups** — handwriting→text, folders, page templates, export,
   offline editing, richer tool set (parked in `todos/notes-tab.md`).
6. **Optional internal cleanup** — npm scope `@ebook-reader/*`, `book`/`library`
   code nouns, and `ebook-reader.*` localStorage keys were intentionally kept
   (D32); rename later only if desired (localStorage rename logs users out).
7. **agent-browser** — wire up a default that avoids the Chrome-for-Testing
   download (executable path or CDP connect) so audits run without the manual
   headless-Chrome step.

---

## Note on process

One misstep during teardown: a blanket `taskkill //IM chrome.exe` was used to
clear a hung provisioning process — that also closes any other running Chrome
(the owner's browser and/or the Playwright-MCP Chromium). Avoid blanket kills;
target by PID.
