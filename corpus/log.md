# Log

## [2026-07-08] decision | Env validated + required at startup (D29, revises D28)

Prompted by a user report: opening the app with empty localStorage never asked
for the platform password. Root cause was working-as-designed — brief 09 (D28)
made `APP_PASSWORD` **opt-in**: unset → API open, no lock screen, only a startup
warning. The dev server was simply running without the var set.

User decided to reverse that: **all `.env` vars are now required and validated
at startup, no defaults** (chose "all vars required" + a single root
`.env.example`). Implemented:
- `apps/api/src/config.ts` rewritten — loads the repo-root `.env` best-effort
  (`process.loadEnvFile`, guarded by `existsSync` so prod can inject via a
  process manager), then validates `PORT`/`HOST`/`APP_PASSWORD`/`MAX_UPLOAD_MB`/
  `CONVERT_TIMEOUT_MS` with a zod schema. Any missing/blank/malformed value →
  clear stderr box + `process.exit(1)`. `APP_PASSWORD` is now typed non-null.
- `apps/web/vite.config.ts` — `envDir` pointed at the repo root (single `.env`
  feeds web too) and throws if `VITE_API_URL` is unset. Dropped the
  `?? "http://localhost:3001"` fallback in `api-client.ts`; `vite-env.d.ts`
  makes `VITE_API_URL` non-optional.
- `apps/api/src/index.ts` — the now-unreachable "API is OPEN" startup warning
  simplified to a confirming log (`isAuthEnabled` kept as defence-in-depth).
- `.env.example` completed (was missing `APP_PASSWORD` + `HOST`); added `zod` to
  `apps/api` deps.

Verified: `node dist/index.js` with `.env` moved aside → exit 1 listing every
missing var; with a valid `.env` → boots + logs "APP_PASSWORD is set". Typecheck
clean ×3. Optional overrides `LIBRARY_DATA_DIR`/`BASE_PATH` stay non-required.
Brief 09 left immutable (records the original opt-in design); D28 clause struck
in decisions.md with a pointer to D29.

## [2026-07-07] done | EPUB accurate book-wide page count (pre-pagination, research option 3)

Replaced the EPUB "Page N/M" counter. It previously used epub.js char-based
`locations` (~1000-char chunks) as the page unit — book-wide but stepped by 2 /
repeated on image pages, and "total" was a chunk count, not pages.

Researched the options (see the summary in-session): per-chapter `displayed`
(resets at boundaries), locations (what we had), and **option 3 — cumulative
per-section rendered-page counts**, the only one that is book-wide + smooth-+1 +
correct-total. Implemented option 3: `reader/epub/epub-page-map.ts` walks every
spine item **on the same rendition the reader uses** (a separate hidden rendition
risks a ±1px width mismatch → boundary jumps, epub.js #274), reads each chapter's
`currentLocation().start.displayed.total`, and builds a prefix sum. Book page =
`offset[section] + displayed.page`. Waits for the column width to settle before
counting (else the total is measured against a transient mount layout and jumps
once). Precompute runs **behind a full loading veil** ("Preparing your book —
counting pages N/M chapters") so the book isn't shown until pages are known;
recomputed (debounced, veil, position preserved) on font size/family/spacing/
margin change and viewport resize. Char `locations` kept for the % rail + seek +
chapter ticks (layout-independent). PDF unchanged (real fixed pages already).

Verified live (Apothecary EPUB): Page 1/242 from the first frame, +1 per turn,
chapter jump to Ch.8 → Page 106/242 (41%). Typecheck ×3 + build clean. Trade-off:
open is slightly slower (one full pre-pagination pass), hidden by the veil.

## [2026-07-07] done | Persistent library + "Quiet Paper" home implemented & verified

Built the feature the decision entry below planned. Three commits: corpus, then
backend, then frontend+integration.

**Backend** (`apps/api`): `better-sqlite3` `books` table + on-disk storage
(`library/<id>.<ext>`, `images/thumbnails/<id>.jpg`, all gitignored). Cover +
metadata extraction (`extract.ts`): EPUB via OPF (EPUB3 cover-image / EPUB2
meta[cover] / first-image fallback, + dc:title/dc:creator); PDF page-1 render
via `pdf-to-img` (bundled pdfjs+canvas, no system deps) → `sharp` 400×600 JPEG.
Routes: POST/GET/`:id/file`/`:id/cover`/PATCH `:id/progress`/DELETE. Shared Zod
`libraryBook` contract. Deps pinned exact (D21).

**Frontend** (`apps/web`): home rebuilt as the library per `wiki/design.md` —
`LibraryHeader` (wordmark + theme toggle), `UploadZone`, `CoverCard` (2:3 cover,
badge, 2px progress bar, typographic fallback, overflow→remove), sort, skeleton,
empty state. `library-api` + React Query hooks; `use-progress-sync` debounced
PATCH. Store gains `loadedBookId`/`progressFraction`. Fonts self-hosted via
`@fontsource` (Playfair Display / Source Serif 4 / Inter — no CDN, D14). Quiet
Paper tokens in `globals.css`, with sepia/dark remaps so the library themes with
the reader.

**Verified live** (Playwright + real arXiv PDF): upload→store+extract, gallery
(real covers + fallback tiles), open→PDF renders, progress persists (page 4/21 →
`progress=0.19`, blue bar on card), delete, sort, light+dark themes. **Bug
found+fixed mid-run:** CORS preflight blocked PATCH (default methods allowlist
omits it) → enumerated methods in `index.ts`. Dark-mode legibility fixed via
theme-variant token remap. Typecheck ×3 + web build clean. See
[test-plans/TP-01-home-upload.md](test-plans/TP-01-home-upload.md).

Not exhaustively verified: sepia theme (spot-checked), EPUB open-to-read with a
real cover-bearing book, refresh-persistence (books persist server-side by
construction; not re-driven in-browser).

## [2026-07-07] decision | Persistent library + "Quiet Paper" design system (reverses D3/D4)

New feature: the home page becomes a **persistent library**. Upload a PDF/EPUB →
it's saved and shows as a **cover card** in a gallery; reopen anytime.

Product-direction change: this **reverses D3** (no persistence) and amends **D4**
(backend was one stateless route). New locked decisions: **D24** persistent
library via SQLite (`better-sqlite3`) in `apps/api`; **D25** thumbnails on disk
(`apps/api/images/thumbnails/`, path in DB) + originals at `apps/api/library/`;
**D26** covers extracted server-side (EPUB OPF cover / PDF page-1 render);
**D27** the merged **[wiki/design.md](wiki/design.md)** ("Quiet Paper") is the
enforced design system. D2 (single-user, no auth) and D9 (reading *position* is
session-only) still hold. Design merged from the Stitch exploration
(`design/stitch_extracted/`) with the existing `--reader-*` reader themes; the
light reading theme's bg/accent were retuned to match the paper surface.
Enforcement wired into [CLAUDE.md](CLAUDE.md). See design.md conformance
checklist. Implementation follows in the next log entries.

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

## [2026-07-07] done | Brief 08 — draggable progress rail, shared by both readers

The EPUB-only `ProgressRail` moved to `reader/chrome/` and gained pointer-capture
drag: the fill + chapter tooltip preview the grab position live; the seek commits
once on release (no per-move rendition thrash); touch scrubs without scrolling;
pointer-cancel aborts cleanly. The PDF reader now mounts the same rail (page-based
percent, ticks from top-level outline entries, page-number tooltip) — it previously
had no rail at all. Scope widened from the source todo to both formats (owner call).
Verified headless-Playwright against both fixtures: 10/10 drag/click/tooltip checks,
zero console errors; typecheck clean ×3. See
[briefs/done/08-draggable-progress-rail.md](briefs/done/08-draggable-progress-rail.md),
[wiki/reader.md](wiki/reader.md). Env note: the library DB rows from the old
`/home/gandolh` checkout point at dead absolute paths (500s on file/cover) —
pre-existing, worked around by re-uploading fixtures; filed as an open question.

## [2026-07-07] done | Brief 09 — platform password (D28, revises D2)

The whole platform now gates behind one shared password (`APP_PASSWORD` env on
the API; unset → auth off + loud startup warning, dev stays frictionless).
API-enforced `onRequest` guard (allowlist: login/status/health/OPTIONS);
stateless token = `sha256hex(password)` accepted as `Authorization: Bearer` or
`?token=` (cover `<img>`s); web stores it in `localStorage`, shows a Quiet-Paper
lock screen (gate in `root-layout.tsx`), and re-locks on any non-login 401.
Built via plan-split-dispatch (haiku contract / opus API / sonnet web); two
sonnet review finders caught three real issues, all fixed: token redacted from
request logs, duplicate `?token=` no longer 500s (clean 401), React Query stops
retrying 401s. Verified end-to-end headless: 10/10 with auth on, disabled mode
clean, zero unexpected console errors, typecheck ×3. See
[briefs/done/09-platform-password.md](briefs/done/09-platform-password.md),
[wiki/decisions.md](wiki/decisions.md) D28.

## [2026-07-07] done | Brief 10 — loading feedback: instant open + download progress

Probing the live deployment confirmed the todo: clicking a cover froze the
library for the whole file transfer (24MB EPUB) with only a subtle card dim,
and a failed download showed nothing (`try/finally`, no `catch`). Now the click
navigates instantly; `useHydrateBook` is the single download path (click +
refresh) and streams with byte progress against the row's `sizeBytes` (the
server sends no Content-Length); `/read` shows an opening screen (cover,
Playfair title, determinate accent bar, %) and an error state with "Try again"
+ back-to-library. Verified on a CDP-throttled network: opening screen in
~65ms, bar advances, error path + retry recover; typecheck ×3. See
[briefs/done/10-loading-feedback.md](briefs/done/10-loading-feedback.md).
Out of scope: the live host's ~3s first-HTML latency (server-side). Owner
instruction mid-brief: the VPS address never goes into git, and nothing is
committed until they say so.
