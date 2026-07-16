# Log

## [2026-07-16] feature | PWA: installable shell + offline reading (briefs 19–20)

Built via orchestrate → plan-split-dispatch (wave 1 = brief 19 senior; wave 2 =
brief 20 split into a senior core-lib chunk and a junior UI chunk), then a
2-finder scoped review + one senior fix pass, then live browser E2E.
**Uncommitted — owner controls.**

**Brief 19 (shell):** `vite-plugin-pwa@1.3.0`, generateSW, manifest + 4 icon
PNGs, prompt-mode updates (`UpdateToast` via `useRegisterSW`, no
skipWaiting/clientsClaim), precache incl. the pdf.js `.mjs` worker (~3 MB / 34
entries), SWR runtime cache for cover thumbnails only, everything derived from
`BASE_PATH`/`VITE_API_URL` (base normalized to trailing slash; cover pattern
from the URL **origin** to match `coverUrl`'s path-dropping `new URL`).

**Brief 20 (offline reading):** `offline-store.ts` (IndexedDB
`ebook-reader:offline` v2 — `books` metadata / `files` blobs / `progress` local
rows), offline-first open at the `useHydrateBook` seam, `useLibraryList`
cached-rows fallback + `isOffline`, per-cover `OfflineToggle`
(idle/downloading/downloaded/error), offline banner, storage caption,
upload/delete disabled offline, `useReconnectProgressSync` last-write-wins
flush. No convert affordance exists in the library UI (convert is disabled
code in the EPUB reader), so "convert offline state" was N/A.

**Review caught (all fixed):** ① duplicate reconnect PATCHes — unstable
`books` array identity re-fired the flush effect and there was no in-flight
guard; **observed live as 3 identical PATCHes per book**, fixed with memoized
rows + a module-level latch, re-verified at exactly 1. ② single-store IDB
design rewrote/loaded every blob on snapshot refresh/listing (100s of MB with
a few PDFs) → v2 blob/metadata split with a live-exercised v1→v2 migration.
③ resume tiebreak: `snapshotAt` bumped on every refresh could shadow newer
offline progress → only bump on real change + prefer pending local rows.
④ stale `offlineBook` could paint the previous book's title/cover on another
book's opening screen → reset on bookId change. ⑤ icons precached twice →
dropped `includeAssets` overlap (38→34 entries). ⑥ unhandled rejection in the
remove path → error state + invalidate in `finally`.

**E2E (production build via `vite preview` + real API, throwaway seeded user,
removed after):** login → download EPUB (24.6 MB) + PDF → offline reload →
shell from SW, banner, downloaded covers, upload "Requires connection" →
EPUB opens offline, jumps to p.25, offline reload resumes at p.25 (exact CFI)
→ PDF renders offline → reconnect flushes pending progress with a single
PATCH per book → next rebuild surfaced the update toast; Reload activated the
new SW and ran the IDB migration cleanly (both blobs intact). New wiki page:
[wiki/pwa.md](wiki/pwa.md). Typecheck + build clean; no absolute paths in
tracked files (user rule).

## [2026-07-13] change | EPUB scroll mode → continuous manager (+ horizontal-scroll & toolbar-overlap fixes)

Follow-up to the image-collapse fix below, informed by an open-source study of
epub.js/react-reader/foliate-js/Readium/audiobookshelf. Three things shipped:

**1. Scroll mode now uses the continuous manager.** Was `flow: "scrolled-doc"`
(default manager — one isolated section per iframe, no cross-chapter scroll).
Now `manager: "continuous" + flow: "scrolled"`, epub.js's canonical
continuous-scroll pairing (its own `continuous-scrolled.html` example;
react-reader README: "scrolled … works best with 'continuous'"; audiobookshelf
uses the same for manga). Stitches consecutive spine sections into ONE seamless
vertical scroll and preloads the next section off-screen. `EpubReader`:
`flow`/`manager` derived from `isScroll`; `epubOptions={{ flow, manager,
spread:"none" }}`. `key={flow}` remount kept — REQUIRED, epub.js can't swap
managers on a live rendition (#995). Verified live on the 302-page EPUB:
`.epub-container` scrollHeight ~17.6k, 2 section iframes mounted, % tracks
(52→54% on scroll), toggling back to paged restores position + edge bars.

**2. Stray horizontal scrollbar (classic scrollbars).** epub.js's
`.epub-container` scrolls both axes; with classic (space-occupying) scrollbars
the vertical bar shrinks client width while the section view stays full-width →
a few px horizontal overflow → stray horizontal scrollbar (WSL/Linux; invisible
with macOS overlay bars — `scrollbarWidth: 0` in headless, so not reproducible
there). Fix: `globals.css` clips the horizontal axis in scroll mode only —
`[data-reader-flow="scroll"] .epub-container, .epub-view { overflow-x: hidden
!important }` + `overflow-anchor: none` (continuous-manager scroll-jump
mitigation, per audiobookshelf) + `overflow-x: hidden` on `html,body` inside the
iframe (themeRules, scroll-only) to catch fixed-width manga wrappers. Image is
centred/narrower than the column, so nothing visible is cut.

**3. Toolbar overlap with long chapter labels.** The grid bar's right cluster
used `justify-self-end`, which sizes the grid item to its content — a long
chapter label + 3-digit page counter overflowed the track and spilled over the
centre cluster, making the mode-toggle unclickable (`elementFromPoint` = the
label span, not the button). Fix: side tracks `1fr` → `minmax(0,1fr)`, and the
right slot drops `justify-self-end` (defaults to `stretch` → fills its track);
flex `justify-end` right-aligns content, `min-w-0 overflow-hidden` truncates the
chapter label instead of overflowing. Verified at page 159 (chapter label
present): clusters no longer overlap, toggle clickable, label ellipsises.

## [2026-07-13] fix | EPUB scroll mode collapsed image pages to a sliver

Follow-up to the reading-bar change below. User report: "Switch to paged view
doesn't work properly — scroll doesn't appear and it even shrinks." Reproduced
on the real Apothecary Diaries EPUB (a manga, many full-page illustrations): in
scroll mode an **image page collapsed to ~8px** with nothing to scroll (looked
"shrunk"). Root cause is pre-existing but was newly surfaced by the scroll-mode
work: `use-epub-theme.ts` `themeRules` capped `img`/`svg` at **`max-height:
94vh`**. In paged mode that fits a full-page illustration to the single screen;
in `scrolled-doc` `vh` resolves against the section iframe's OWN
(content-driven) height, so it's circular — the iframe starts ~0px → 94vh ≈ 0 →
the image lays out ~0 → the iframe never grows. Proven live: forcing
`max-height:none` on the image grew the body 8px → 1205px.

Fix: `themeRules` takes an `isScroll` flag and **omits the `vh` cap in scroll
mode** (width-capped only, natural aspect, the tall page just scrolls); paged
keeps the cap. `useEpubTheme` subscribes `pageMode` and passes it (added to the
effect deps so a mode flip re-registers the theme with the right rule). The
off-screen page-map `applyStyles` stays paged (default `false`; it's skipped in
scroll mode anyway).

Verified live (real 302-page EPUB, page 4 = illustration): scroll mode iframe
`8px → 1013px`, container `vScroll:true / hScroll:false`, 0 edge bars; toggling
back to paged restores the fit-to-screen illustration + edge bars. Round-trip
paged⇄scroll clean. PDF scroll→paged also re-checked (canvas full size, vertical
scroll present). Typecheck clean.

## [2026-07-13] change | Reading-bar stability + visible page-flip edge bars + scroll-mode axis lock

User report against the floating reader bar: (1) its items shifted as content
changed; (2) scroll mode allowed horizontal scrolling; (3) paged mode had no
visible flip affordance; (4) flips fired from clicking the page body. Fixed
across four files in `apps/web/src/reader`:

- **Bar no longer shifts** — `ReaderToolbar` switched from `flex justify-between`
  to `grid grid-cols-[1fr_auto_1fr]` (left→start, centre→centre, right→end).
  `justify-between` only centres the middle cluster when the two side clusters
  are equal width; ours aren't (Home vs chapter+page+%), so the middle controls
  slid whenever the chapter label or page-digit count changed. The grid pins the
  centre cluster; sides grow into equal side tracks.
- **Visible edge bars** — `PageNav` rewritten from invisible outer-third
  click-zones to two **visible full-height edge bars** (faint `bg-reader-fg/[.03]`
  fill + hairline `border-reader-border/60` inner edge + centred 1.75-stroke
  chevron; `w-9`/`sm:w-12`). Hover deepens; disabled → fades out + non-clickable.
- **Flip only via the bars** — the full-page tap-zones are gone, so clicking the
  page body no longer flips (verified: `elementFromPoint(centre)` = the epub
  iframe / PDF page, not a button). Keyboard arrows kept (`use-page-nav-keys`) —
  user chose "keep keyboard arrows", buttons are the visible primary affordance.
- **No horizontal scroll in scroll mode** — PDF scroll container is
  `overflow-y-auto overflow-x-hidden` and `pageWidth` ignores `zoom` in scroll
  mode (fit-to-column), so a zoomed page can't force a sideways scrollbar. Zoom-
  to-pan stays a paged-mode affordance. EPUB `scrolled-doc` was already clipped
  by the content row's `overflow-hidden`.

Verified live (dev server, `?dev=1` PDF + `?format=epub&dev=1`): typecheck
clean; EPUB paged flip via edge bar works and the centre cluster stayed pinned
as the right cluster grew (`0%`→`100%`); page centre = iframe (no flip on body);
PDF scroll mode after 3 zoom-ins → `scrollWidth == clientWidth`, `overflow-x:
hidden`, zero page-flip buttons, no document horizontal scroll. Conforms to
design.md (theme tokens only, 1.75-stroke icons, soft radii; the toolbar pill
keeps its sanctioned transient-overlay radius). `wiki/reader.md` updated.

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

## [2026-07-13] todo | Briefs 11–14 filed — reader UX + a bug

Filed four reader briefs from user requests (all in `briefs/todo/`, not started):
[11 — paged⇄scroll mode toggle](briefs/done/11-reading-mode-toggle.md) (store
flag + PDF multi-page render + EPUB `flow: scrolled-doc`),
[12 — bottom-bar clustering](briefs/done/12-bottom-bar-clustering.md) (move PDF's
settings gear out of the right cluster so PDF matches EPUB's home/actions/page
layout; the `ReaderToolbar` shell already does justify-between),
[13 — page-input digit bug](briefs/done/13-page-input-select-bug.md) (root cause
found: `PageJumpInput` calls `.select()` in a `[draft]` effect, so every
keystroke re-selects and the next digit replaces — typing "12" lands "2";
shared control, affects PDF too), and
[14 — PDF/EPUB visual parity](briefs/done/14-reader-visual-parity.md) (give PDF
the EPUB running-header + column/background frame; must conform to design.md D27).

## [2026-07-13] maintenance | DB seeded with two user accounts

Inserted users **teo** and **alex** directly into `apps/api/data/library.db`
(reusing the app's scrypt `hashPassword` + `upsertUser`; no `seed.ts` written per
owner request). Confirms the code now uses per-user accounts, not the shared
`APP_PASSWORD` — see the drift note below.

## [2026-07-13] ingest | Performance benchmark (bundle + code) → briefs 15–18

Ran a performance pass ("use personal skills"). The `performance-analysis` skill
needs Chrome DevTools MCP (not registered here) and the app is auth-gated, so
live CWV/traces weren't possible; measured what was: a production `vite build`
and a code audit of the reader hot paths. Findings (measured):
- **Entry JS = 1,418.94 kB (gzip 434 kB), one monolithic chunk** — `read.tsx`
  statically imports BOTH readers, so pdf.js + epub.js ship to every user. Vite
  warns on the >500 kB chunk. → [brief 15](briefs/done/15-code-split-readers.md).
- **pdf.worker.min = 1,046 kB** (already on-demand — fine).
- **Fonts = 920 KB** (412 KB woff2 + 508 KB legacy woff; cyrillic/greek/vietnamese
  subsets for an English-first app). → [brief 17](briefs/done/17-font-payload-trim.md).
- **EPUB open parses the file twice** (react-reader buffer + a throwaway `Book`
  for the off-screen page-map walk) plus `locations.generate(1000)`, eagerly on
  every open. → [brief 16](briefs/done/16-epub-open-cost.md).
- Filed [brief 18](briefs/done/18-live-perf-benchmark.md) to stand up the live
  CWV/trace measurement the pass couldn't run, so 15–17 can be ranked by measured
  user time, not payload alone.

## [2026-07-13] maintenance | Corpus structure upgraded to personal-skills v0.20.0 conventions

Added `summary:`+`updated:` frontmatter to all 8 wiki pages; wrote `corpus/lint.sh`
(frontmatter / relative-link / page-size checks + `--index` catalog generator);
`index.md`'s wiki catalog is now generated; added the retrieval budget + lint rule
to `CLAUDE.md`; restored `briefs/todo` + `briefs/superseded` dirs and fixed 4
broken links the linter caught. Also documented this project's `test-plans/` layer
in the `corpus-flow` skill source. `bash corpus/lint.sh` passes.

## [2026-07-13] incident | Corpus content drift vs. code (auth / reading progress) — UNRESOLVED

Per-user accounts + per-user reading progress landed in code (commits `7caaa42`,
`207cf7b`; `users`/`sessions`/`reading_progress` in `apps/api/src/db.ts`;
`config.ts` no longer requires `APP_PASSWORD`), but the wiki still describes the
shared-password model (`decisions.md` D28/D29, and D2/D9 stances). No prior log
entry recorded the change. Flagged in `CLAUDE.md` + `status.md`; needs an explicit
decisions reconciliation (new D-entry + wiki update) rather than a quiet rewrite.

## [2026-07-13] done | Briefs 11–18 built via orchestrate → plan-split-dispatch (6 waves)

Built the whole reader backlog with the model-routed subagent orchestrator
(controller opus; sonnet for mechanical chunks, opus for design/perf). Waves:
1 (parallel) 13‖15‖17, then serial 12 → 14 → 11 (shared reader files), then 18
(measure) → 16 (optimize). Every wave passed a controller verify gate (typecheck
+ build). All briefs moved to `briefs/done/` with per-brief outcome notes.

**What shipped:**
- **11** paged⇄scroll toggle (`pageMode` store field; PDF windowed multi-page +
  IntersectionObserver; EPUB `flow: scrolled-doc`).
- **12** PDF bottom bar clustered like EPUB (settings gear → middle; right = page/%).
- **13** page-jump digit bug fixed (select-all only on focus transition).
- **14** shared `ReaderHeader`; PDF adopts EPUB's 3-row grid frame.
- **15** readers code-split — **entry JS 1,418.94 kB → ~407 kB (gzip 434 → 123 kB)**.
- **16** EPUB open-cost caching (locations + page-map) — **same-book re-open
  locations 4711→66 ms, page-map 2814→376 ms**; cold unchanged.
- **17** font payload **920 KB → 544 KB** (per-subset imports).
- **18** live perf benchmark harness + `wiki/performance.md` baseline.

**Review + fixes (scoped 3-finder review → 1 opus fix pass):** eight findings
fixed, incl. two real bugs — PageNav tap-zones stayed live in scroll mode (both
readers), and deep-page scroll-mode resume was corrupted by late page-aspect
reflow — plus EPUB cache-key collision (added `lastModified`), sub-pixel stale
page-map key, a `locations.generate` cancellation guard, a chunk-load
`ReaderChunkErrorBoundary`, and removal of the dead `layoutMode` store field.
Final typecheck + build clean; readers still split. See
[wiki/reader.md](wiki/reader.md), [wiki/performance.md](wiki/performance.md).
Nothing committed — owner controls.

Follow-ups noted (not filed): `/file` served no-cache so the 24 MB EPUB
re-downloads every open (server-side caching); a durable IndexedDB locations
cache for first-open-after-reload; dropping legacy `.woff` (needs `sass`).

## [2026-07-13] decision | Corpus reconciled with per-user auth + reading progress (D30, D31)

Resolved the flagged content drift: the per-user work that shipped in code on
2026-07-08 (commits `7caaa42` per-user accounts, `207cf7b` per-user reading
progress) is now recorded as locked decisions. **D30** — per-user accounts
(operator-seeded, scrypt-hashed, opaque `sessions`, always-on `onRequest` guard;
`APP_PASSWORD` removed) replaces the shared platform password, revising D2/D28/D29.
**D31** — per-user reading progress + exact resume position (`reading_progress`
table) revises D9's "position is session-only" and the legacy global
`books.progress` column. Verified against `apps/api/src/{auth,db,password,config}.ts`.
Marked D2/D9/D28/D29 revised; updated `overview.md`, `architecture.md` (tables +
auth flow + backend stack), and `CLAUDE.md` (one-liner, dropped the drift box).
Also fixed a duplicated line in `open-questions.md`. `bash corpus/lint.sh` passes.
The library remains shared across users (no per-book ownership).

## [2026-07-16] todo | Brief 21 filed — group the library by metadata

Captured [todos/group-library-by-metadata.md](todos/group-library-by-metadata.md)
(with inline web research: EPUB OPF `dc:subject` + `calibre:series` /
`belongs-to-collection` series conventions; PDF Info dict is best-effort only),
grilled the owner, and promoted it to
[briefs/done/21-group-library-by-metadata.md](briefs/done/21-group-library-by-metadata.md).
Locked in the grill: group keys author + series + subject, section-headers-only
UX, PDFs best-effort → "Unknown" group, multi-valued fields use first value
only. Extraction extends the native OPF parse in `extract.ts` (no Calibre
shell-out); existing rows get a one-time backfill. Not started.

## [2026-07-16] decision | Brief 21 display treatment: a shelf per group

Rendered four Quiet Paper mockups of the grouped gallery as an artifact
("Brief 21 — Group display options": chapter-head rules, shelf per group,
margin index, collapsible groups — same fake library in each, real
Playfair/Inter tokens). Owner picked **B — a shelf per group**: caps label +
count over one horizontal row of covers on a hairline plank, horizontal
overflow scroll, Unknown shelf last. Brief 21's UI step + acceptance updated
(it's still in `todo/`, so mutable); drill-in filtering stays out of scope per
the original grill.

## [2026-07-16] decision | Brief 21 finalized — Shelves ⇄ Stacks behind a View toggle

Second design artifact ("Brief 21 — Library view toggle", interactive Quiet
Paper demo) approved: the grouped library gets a two-segment **View** control
(Shelves | Stacks) in the header, visible only while Group by ≠ None. Shelves
(option B) stays the default browse view; Stacks is the drill-in exploration E
(fanned stack index → filtered group page via `/library?g=<key>`, browser-Back
safe). Preference persists to localStorage like paged⇄scroll. Brief 21's UI
step + acceptance rewritten to the final spec; still pure-client on top of the
brief's metadata fields — no extra backend work. Ready to build.

## [2026-07-16] maintenance | Closed two stale todos; captured in-app catalog download

Closed `todos/draggable-reading-progress-bar.md` (shipped in brief 08) and
`todos/add-platform-password.md` (obsolete — D30 per-user accounts replaced
the shared password) at the owner's direction. Captured a new todo,
[todos/in-app-catalog-download.md](todos/in-app-catalog-download.md):
Foliate-style in-app download from free/legal catalogs, with inline research —
OPDS is the standard; Project Gutenberg via Gutendex is the v1 pick (respect
the PG robot policy, cache catalog queries, download EPUBs through the
existing upload pipeline server-side); Standard Ebooks quality is great but
its full feeds are patron-gated; Internet Archive lending ruled out.

## [2026-07-16] todo | Brief 22 filed — Gutenberg discover page

Grilled and promoted [todos/in-app-catalog-download.md](todos/in-app-catalog-download.md)
to [briefs/done/22-gutenberg-discover.md](briefs/done/22-gutenberg-discover.md).
Locked: v1 = Project Gutenberg via the public Gutendex instance (server-side
TTL cache, PG robot policy honored); a dedicated `/discover` page with search +
popular landing + topic/language browse, built on the existing TanStack
Router (code-based tree, Zod search schema) + TanStack Query (import mutation
invalidates the library query); imports run through the existing upload
pipeline and land as normal library cards with `source`/`source_id`
provenance; duplicates get an "In library" badge, reimport allowed. Noted
schema-migration coordination with unbuilt Brief 21 (disjoint columns).
Not started.

## [2026-07-16] todo | Brief 23 filed — media library (music + video)

Grilled and filed [briefs/todo/23-media-library.md](briefs/todo/23-media-library.md)
directly from an owner request (no source todo): the library also holds
**mp3 audio and MP4/WebM video**, uploaded and played in-app. Locked: one
gallery with a persisted type filter (no separate routes); browser-native
formats only — no transcoding and **no ffmpeg** (video cards use the
typographic tile; metadata via the pure-JS `music-metadata` package, with
artist/album mapped onto the existing author/series columns so grouping just
works); full D31 progress parity (per-user resume, seconds-offset locator);
`GET /library/:id/file` gains HTTP Range support (206) for scrubbing —
Safari requires it. Offline downloads stay books-only for v1. Inline research:
MDN codec guide + caniuse (H.264/WebM are the native baseline, HEVC/MKV are
not), music-metadata (ID3 + cover art + duration, mp4/webm best-effort),
range-request serving patterns. Noted three-way schema-migration coordination
with unbuilt briefs 21/22 (disjoint columns). Not started.

## [2026-07-16] done | Briefs 21 + 22 — grouped library and Gutenberg discover shipped

Built via orchestrate → plan-split-dispatch in two waves (21 backend → 21
frontend → gate → 22 backend → 22 frontend → gate), 3 opus + 1 sonnet chunks.
Brief 21: series/subjects extraction + migration + backfill, grouped gallery
with the Shelves ⇄ Stacks toggle (`?g` drill-in, localStorage prefs). Brief 22:
`/discover` page over an API-side Gutendex proxy (TTL cache) importing EPUBs
through the existing pipeline with provenance fields. Scoped review (3 finders:
integration/backend/frontend) surfaced 7 real findings — attribute-order OPF
meta parsing, EPUB3 refines fragility, mirror sub-path loss in
GUTENDEX_BASE_URL, numeric XML entities, StackIndex fallback drift, case-split
group buckets, history spam from debounced search — all fixed and re-gated.
Verified: typecheck + build green ×3 gates; live API E2E on a scratch data dir
(seeded user, popular/search proxied, cache hit 167ms→8ms, book #55 imported
in 3.5s with cover + 14 subjects, file/cover streamed, typed 400/404 errors).
Briefs moved to done/ with outcome notes; status.md + architecture.md updated.
**Uncommitted — owner controls git.** Brief 23 (media-library, owner-filed)
remains in todo/.
