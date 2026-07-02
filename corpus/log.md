# Log

## [2026-07-02] decision | Corpus bootstrapped + full spec ingested

Bootstrapped `corpus/` for the ebook-reader project. Folded the finalized spec
from the grill session into the wiki (overview, architecture, decisions, reader,
conversion, status, open-questions). Filed briefs 01–07 covering the full
implementation plan. See [wiki/overview.md](wiki/overview.md).

## [2026-07-02] decision | Tailwind v4 locked (D20)

Resolved the open Tailwind-version question in favor of **Tailwind v4** (matches
Base UI's documented examples). Removed from open-questions; recorded as D20 in
[wiki/decisions.md](wiki/decisions.md). Build to run all waves autonomously.

## [2026-07-02] done | Brief 01 — monorepo scaffold

npm-workspaces monorepo stood up: `@ebook-reader/{web,api,shared}`. React 19 +
Vite 6, Fastify 5 (`tsx watch`, port 3001, `/health`), shared = zod lib. Verified:
`npm install` clean, `npm run typecheck` passes across all three, shared resolves
in both apps. Deferred: gitignored `shared/dist` needs a build before cold-clone
typecheck. See [briefs/done/01-monorepo-scaffold.md](briefs/done/01-monorepo-scaffold.md).

## [2026-07-02] done | Brief 02 — shared Zod contract

`packages/shared` now the source of truth: `detectFileType`, size guards,
`convertRequestSchema` (EPUB-only), `convertErrorSchema` (`{error, code}` union).
Legacy `SUPPORTED_FORMATS`/`Format` preserved for the apps. Typecheck passes.
See [briefs/done/02-shared-zod-contract.md](briefs/done/02-shared-zod-contract.md).

## [2026-07-02] decision | Pin exact dependency versions (D21)

User: all deps pinned exact (no `^`/`~`), latest stable. Retrofitted root +
`packages/shared` to installed versions (concurrently 9.2.3, typescript 5.9.3,
zod 3.25.76). In-flight briefs 03/04 told to pin what they add. Recorded as D21.

## [2026-07-02] done | Brief 03 — backend /convert route

Stateless Fastify `POST /convert` (config/calibre/temp-files/convert-route modules).
Validates via shared schemas, spawns `ebook-convert` with 60s timeout, streams PDF
as attachment, cleans temp in `finally`. Error→HTTP mapping wired to shared
`convertErrorSchema`. Deps pinned (`@fastify/cors 11.2.0`, `@fastify/multipart 10.0.0`),
`fastify` pinned to 5.9.0. Verified except live conversion (Calibre absent on dev box).
See [briefs/done/03-backend-convert-route.md](briefs/done/03-backend-convert-route.md).

## [2026-07-02] done | Brief 04 — frontend shell

Vite+React shell: code-based TanStack Router (`/`, `/read`), Query provider,
Zustand reader store, Tailwind v4 (theme tokens), Base UI Dialog proven, api
client reading `VITE_API_URL`. Base UI package confirmed `@base-ui/react@1.6.0`
(D22). All web deps pinned exact; Node pinned ≥22 / `.nvmrc` 22.23.1 (D23).
Wave 3 complete. See [briefs/done/04-frontend-shell.md](briefs/done/04-frontend-shell.md).

## [2026-07-02] done | Brief 05 — smart uploader + convert flow

`/` dropzone classifies via shared `detectFileType`; PDF → `/read?format=pdf`,
EPUB → Read | Convert fork. Convert `useMutation` → Download + Go back; shared
`convertErrorSchema` mapped to friendly messages. File handed to reader via
additive Zustand `loadedFile`/`loadedFormat`. No deps added. Verified typecheck +
build + live API contract. See [briefs/done/05-uploader-and-convert-flow.md](briefs/done/05-uploader-and-convert-flow.md).

## [2026-07-02] done | Brief 06 — PDF reader + shared chrome (crux)

Format-agnostic shared chrome in `reader/chrome/` with a slot-based
format-adaptive toolbar seam (`formatControls`) for brief 07 to reuse. react-pdf
+ bundled PDF.js worker (Vite `?url`), TextLayer on. PDF TOC only when outline
exists (resolves open Q). Invert-dark for fixed layout. Deps pinned `react-pdf
10.4.1` + `pdfjs-dist 5.4.296`. Store additive `zoom`. Verified typecheck + build
+ pdfjs Node validation; not pixel-verified (no headless browser). Wave 4 complete.
See [briefs/done/06-pdf-reader.md](briefs/done/06-pdf-reader.md).

## [2026-07-02] done | Brief 07 — EPUB reader + shared search (final brief)

react-reader EPUB reader in `reader/epub/`, reusing the shared chrome via the
`formatControls` seam (no forks). Full light/sepia/dark applied to the epub.js
rendition (real reflow theming). TOC from `book.navigation.toc`. Shared
`SearchPanel` with providers for both formats: EPUB spine walk + PDF
search-on-demand (resolves the last open Q). Deps pinned `react-reader 2.0.15`,
`epubjs 0.3.93`, `react-swipeable 7.0.2`; no epubjs/Vite polyfill needed. Verified
typecheck ×3 + Vite build (599 modules). **All 7 briefs done — build complete.**
Remaining gaps are dev-machine only: Calibre absent (live conversion untested) +
no headless browser (readers not pixel-verified). See
[briefs/done/07-epub-reader-and-search.md](briefs/done/07-epub-reader-and-search.md).

## [2026-07-02] verify+fix | Full browser test run (Playwright) + UI audit — both verification gaps closed

First live run of the whole app against real files (arXiv PDF; a real 24MB
commercial EPUB) with Playwright MCP + Calibre 5.37 on host. Test practice
scaffolded: plans in `corpus/test-plans/` (TP-01…TP-05 + RESULTS.md), run hub in
`playwright/` (gitignored per owner request, incl. screenshots). All five plans
PASS after a verify→fix loop. Big catches: EPUB reader rendered **blank** on
real-world books (EPUB3 nav hrefs relative to a subdirectory nav doc don't
resolve in the epub.js spine → "No Section Found"; fixed with a spine-href
resolver + `location={cfi ?? 0}`); no way back home from either reader (new
shared `HomeButton`); auto-hide chrome hid under the open popover/cursor and
never revealed over the EPUB iframe (chrome-hold + rendition event forwarding);
search jumps now highlight the match (PDF `<mark>` via customTextRenderer, EPUB
`annotations.highlight`); fresh-checkout `npm run dev` failed until shared is
built (dev script now builds it); live conversion worked only with
`PYTHONNOUSERSITE=1` (host pip lxml vs distro Calibre — API now sets it;
verified 200 + valid 28MB PDF in ~6s). UI audit fixes: toolbar wraps at mobile,
EPUB progress shows a single % chip, favicon, contrast bump. Typecheck ×3
clean. Full detail: [test-plans/RESULTS.md](test-plans/RESULTS.md).

## [2026-07-02] build | "Quiet paper" EPUB reader redesign + one-step upload flow

Designed via impeccable shape (brief confirmed by owner: quiet-paper feel,
single centered column, all four priority areas). Reader changes: measure-capped
centered column (`spread: none`, max-w-2xl, `relative` anchor is load-bearing);
running header (book title / current chapter) + scrubbable bottom progress rail
with chapter ticks + hover tooltip (locations-space, exact alignment with fill);
footer chapter·% button opens the TOC scrolled to the current chapter
(highlight + dot); "Aa" settings panel (theme swatches as miniature pages, font
specimens, A−/A+ steppers); search panel groups results by chapter and bolds
the query; skeleton-page loading; jump crossfade as an overlay veil; hyphenation
+ centered/fitted cover images; unified 1.75 icon strokes; quieter edge arrows
(pointer-fine only). Toolbar wrapper is pointer-events-none so the rail under
it stays scrubbable. **Flow collapsed (owner request): upload → read directly
for both formats — the EPUB fork screen is gone; "Download as PDF" is now a
secondary toolbar button in the EPUB reader (spinner while converting, transient
error notice). PRODUCT.md added (impeccable init).** Verified live with the
real book: column/rail/TOC/search/Aa/download all exercised; themes proven
correct via print-pipeline render (viewport screenshots in this WSL headless
env can serve stale composited frames for pages hosting huge epub iframes — a
capture artifact, not a product bug; settings changes also re-render the
current section as belt-and-suspenders). PDF reader regression-checked.
Typecheck + build clean.
