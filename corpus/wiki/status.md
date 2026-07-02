# Status — 2026-07-02 (post test run)

**Phase:** ✅ **v1 verified + "quiet paper" redesign shipped (2026-07-02 pm).**

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
