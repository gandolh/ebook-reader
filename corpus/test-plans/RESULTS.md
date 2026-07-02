# Test run results — 2026-07-02

Full browser-driven run (Playwright MCP) against real files in `testing_files/`
(arXiv PDF 2603.16021v2; The Apothecary Diaries Vol. 13 EPUB, 24MB). Live
Calibre 5.37 on host. All plans re-verified after fixes.

| Plan | Outcome | Notes |
|---|---|---|
| TP-01 Home/upload | **PASS** | Routing, EPUB fork, cancel, invalid-type error, no-file state, keyboard all good. Favicon 404 fixed. |
| TP-02 PDF reader | **PASS** (after fixes) | Render/nav/bounds/zoom (real re-render)/fit/TOC/search/themes/settings/auto-hide all work. Fixed: chrome hid under open popover & under resting cursor; search jump now highlights matches. |
| TP-03 EPUB reader | **PASS** (after fixes) | Was a hard FAIL: blank page on this real book ("No Section Found"). Fixed nav-href/spine resolution + initial location. TOC/search/themes/fonts/keys/progress verified post-fix. |
| TP-04 Convert (live Calibre) | **PASS** | Real EPUB→PDF: HTTP 200, 28MB valid PDF (correct metadata), ~6s. In-flight state, download, go-back, structured 400/500 errors, temp cleanup, health OK. |
| TP-05 UI/UX audit | **PASS w/ fixes** | Mobile/tablet/desktop, drawers (focus trap, backdrop, Escape, focus return), contrast (3 themes), keyboard. Fixed: toolbar clipping on mobile (wraps now), EPUB progress duplication, helper-text contrast. |

## Evidence
`playwright/screenshots/TP-*.png` (gitignored, this run). Notables:
`TP-03-1-epub-open.png` (the blank-page FAIL) vs `TP-03-2-epub-fixed.png`;
`TP-02-6-search-highlight.png` + `TP-03-10-epub-search-highlight.png` (new
highlight-on-jump); `TP-05-5-pdf-mobile-fixed.png` (toolbar wrap).

## Findings → fixes shipped this run

| id | Severity | Finding | Fix |
|---|---|---|---|
| F1 | high | EPUB reader blank on real-world books whose EPUB3 nav doc lives in a subdirectory (`Text/toc.xhtml` → hrefs like `cover.xhtml` don't resolve in the spine; react-reader's `toc[0].href` fallback throws "No Section Found") | `resolve-spine-href.ts` (suffix-match against spine) used by TOC jumps; initial `location={cfi ?? 0}` so the fallback path is never taken; search label lookup tolerates relative hrefs (`EpubReader.tsx`, `epub-search.ts`) |
| F2 | high | No way back home from either reader (readers cover the nav; PageNav click-zones swallow logo clicks) | `HomeButton` in shared chrome, `leftControls` of both toolbars |
| F3 | med | Auto-hide chrome: toolbar faded out under an open settings popover, under a resting cursor, and never revealed over the EPUB iframe (its events don't bubble) | chrome hold counter in store (`useChromeHold`) held by toolbar hover/focus + popover/drawer/search while open; `useAutoHideChrome` returns `reveal`; EPUB forwards rendition `mousemove/click/keydown/touchstart`; rendition `keydown` also drives page-turn keys |
| F4 | med | Search jump landed on the page/CFI with nothing marking the match | PDF: `customTextRenderer` wraps query in `<mark>`; EPUB: `annotations.highlight` on the landed CFI (previous highlight removed); `SearchPanel.onJump` now passes the executed query |
| F5 | med | `npm run dev` fails on fresh checkout (`@ebook-reader/shared` dist missing) | root `dev` script builds shared first |
| F6 | med | Live conversion failed on this host: distro Calibre picks up `~/.local` pip lxml → libxml2 mismatch (env, not code) | API spawns `ebook-convert` with `PYTHONNOUSERSITE=1` (matches Calibre's own isolation); verified 200 + valid PDF |
| F7 | low | Toolbar clipped at 375px; EPUB progress read "33 / 100 33%"; favicon 404; results-count text ~3.5:1 | toolbar `flex-wrap`; `ProgressIndicator variant="percent"`; inline SVG 📖 favicon; `/50`→`/60` |
| F8 | low | EPUB progress stuck at 0% until first page turn (locations still generating) | refresh percent when `locations.generate` resolves |

## Known non-issues / accepted
- Base UI slider inputs are labelled via `aria-labelledby` (checked — fine).
- Cover/illustration pages render at the book's own image size in a spread
  (epub.js default) — matches the source EPUB, left as-is.
- Focus rings are browser-default (`outline auto`) — visible on keyboard focus.
- Generic "Conversion failed." copy is the intentional per-code friendly map.

## Environment note (dev box)
The host's `~/.local` pip `lxml 6.1.1` breaks the *distro* Calibre CLI when run
without `PYTHONNOUSERSITE=1`. The API now sets it; if you ever run
`ebook-convert` by hand, prefix with `PYTHONNOUSERSITE=1`.
