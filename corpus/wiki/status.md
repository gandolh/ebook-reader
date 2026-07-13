---
summary: Dated snapshot of current state — a one-liner per brief/area and where things stand right now. The living dashboard.
updated: 2026-07-07
---

# Status — 2026-07-07

**Latest:** ✅ **Brief 10 — loading feedback** (2026-07-07 pm, **uncommitted by
owner instruction**). Cover clicks navigate instantly; the book downloads behind
an opening screen with a real progress bar (streamed against `sizeBytes`);
failures get an error state + retry (previously silent). All three 2026-07-07
todos are now done. NOTE: briefs 08/09 are committed; brief 10 + this corpus
update are not — owner decides when.

**Earlier today:** ✅ **Brief 09 — platform password** (D28 revises D2).
`APP_PASSWORD` on the API gates everything (stateless sha256 token, Bearer or
`?token=` for covers); Quiet-Paper lock screen, localStorage persistence,
re-lock on 401. Review-hardened (log redaction, duplicate-token 401, no 401
retries). Verified end-to-end headless. **Update 2026-07-08 (D29): `APP_PASSWORD`
is now a REQUIRED, validated env var — the old "unset → auth off" open mode is
gone; the API refuses to start without it (and every `.env` var).**
**Deploy note: set `APP_PASSWORD` (and all `.env` vars) on the VPS — the API
won't boot otherwise.**

**Also today:** ✅ **Brief 08 — draggable progress rail, both readers**.
The scrub rail is now shared chrome: pointer-capture drag with live preview,
commit-on-release; the PDF reader gained the rail (outline ticks, page tooltip).
Verified headless (10/10 checks, both fixtures, zero console errors). Remaining
open todos: loading-state polish (needs the live link).
New open question: library DB stores absolute file paths (dead rows after a
checkout move — see [open-questions.md](open-questions.md)).

**Prior phase:** ✅ **Persistent library + "Quiet Paper" home shipped & verified**
(2026-07-07; reverses D3/D4, see D24–D27 and [design.md](design.md)). SQLite +
on-disk file/cover storage, server-side cover extraction, library CRUD, and the
rebuilt cover-card home. Verified live (Playwright + real files); see the log +
TP-01. Not exhaustively covered: sepia theme, EPUB open-to-read with a real
cover.

**Earlier:** ✅ v1 verified + "quiet paper" redesign shipped (2026-07-02 pm).

Since the morning test run: the EPUB reader got a designer pass (single centered
column, running header, scrubbable chapter-tick progress rail, "Aa" settings
panel, chapter-aware TOC/search, skeleton loading) and the upload flow collapsed
to one step — upload → read for both formats, with "Download as PDF" as a
secondary toolbar action inside the EPUB reader. PRODUCT.md now anchors design
work. See log entry + wiki/reader.md.

All 7 briefs done + a full Playwright test run against real files (arXiv PDF +
a real 24MB commercial EPUB) with live Calibre. Both former verification gaps
are closed; every test plan passes after a verify→fix loop. Zero console
errors on a fresh load. Typecheck clean ×3.

## What the run fixed (headlines)
- **EPUB blank-render on real-world books** (nav-doc-relative hrefs vs epub.js
  spine) — the reader now opens the Apothecary Diaries volume correctly.
- **No way home from the readers** — shared `HomeButton` in both toolbars.
- **Auto-hide chrome misbehaviors** (hid under open popover / resting cursor;
  never revealed over the EPUB iframe) — chrome-hold + event forwarding.
- **Search jumps highlight the match** in both formats now.
- **Fresh `npm run dev` works** (builds `shared` first).
- **Live conversion verified** (~6s for the 24MB EPUB → valid 28MB PDF);
  API spawns Calibre with `PYTHONNOUSERSITE=1` to dodge host pip lxml.
- UI audit: mobile toolbar wraps, EPUB progress is a single % chip, favicon,
  contrast bump.

## Testing practice (new)
- Plans: `corpus/test-plans/` (TP-01…TP-05, RESULTS.md — latest run).
- Run hub: `playwright/` (bring-up, fixtures, conventions; gitignored).
- Fixtures: `testing_files/` (personal books; gitignored).

## Briefs
| # | Brief | State |
|---|---|---|
| 01–07 | v1 build | **done** |
| — | Full browser verification + UI audit | **done (2026-07-02)** |
| 08 | Draggable progress rail (shared, both readers) | **done (2026-07-07)** |
| 09 | Platform password (`APP_PASSWORD`, D28) | **done (2026-07-07)** |
| 10 | Loading feedback (instant open + download progress) | **done (2026-07-07, uncommitted)** |
