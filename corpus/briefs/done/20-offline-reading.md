# Task 20 — PWA phase 2: offline reading

## Context (2026-07-16)
Builds on brief 19 (service worker + installability must already be merged).
Goal: a book the user explicitly downloaded is readable with zero connectivity.

Approved product decisions (do not relitigate):
- **Explicit per-book "Available offline" toggle**, not auto-caching — PDFs are
  large. Downloaded file + its `LibraryBook` metadata row live in **IndexedDB**,
  keyed by book id.
- **Last-write-wins progress sync** on reconnect — no queue of intermediate
  positions.
- Cached content is readable offline without re-auth (it's on the device).
- Upload / delete / EPUB→PDF convert stay online-only with clear
  "requires connection" states.

Load-bearing seams in the code (verify before building on them):
- All book opening flows through
  [use-hydrate-book.ts](../../../apps/web/src/lib/use-hydrate-book.ts) →
  `fetchBookFile()` in [library-api.ts](../../../apps/web/src/lib/library-api.ts)
  → in-memory `File` in the Zustand store. The offline store check belongs at
  this seam.
- Progress sync is already debounced best-effort
  ([use-progress-sync.ts](../../../apps/web/src/lib/use-progress-sync.ts)) —
  extend, don't replace.
- Library list is a react-query fetch (`["library", "recent"]`); progress is
  per-user (D31) and the API is cross-origin with bearer auth.

## What to do
1. **Offline store module** (`apps/web/src/lib/offline-store.ts`): a small
   typed IndexedDB wrapper (no new deps unless truly needed; if one is, `idb`
   only) storing per book id: file blob, `LibraryBook` row snapshot, saved-at
   timestamp, plus a local progress record `{fraction, locator, updatedAt}`.
   Expose: get/put/delete book, list all, storage estimate
   (`navigator.storage.estimate()`), get/put local progress.
2. **"Available offline" toggle** on the library cover card (and/or its detail
   affordance): idle → downloading (reuse `fetchBookFile`'s progress fraction) →
   downloaded (with remove action). Show storage used somewhere unobtrusive on
   the library page. Quiet Paper conformance mandatory.
3. **Hydrate seam**: in `useHydrateBook`/`fetchBookFile` path, check the offline
   store first; hit → open from the stored blob (no network); miss → network as
   today. On network failure for a stored book, fall back to the stored copy.
4. **Library offline fallback**: when `GET /library` fails, render the
   offline-stored book rows with an offline banner; non-stored actions
   (upload zone, delete, convert) disabled with a "requires connection" state.
   Consider `navigator.onLine` + fetch-failure as the combined signal.
5. **Progress while offline**: keep writing the local progress record on every
   debounced tick; when a PATCH succeeds, it becomes authoritative. On
   reconnect/app start, if the local record is newer than the server's
   (`updatedAt` vs the fetched row), PATCH it once (last-write-wins). Opening a
   stored book offline resumes from the local record when it's newer than the
   snapshot's locator.
6. Update the stored `LibraryBook` snapshot opportunistically whenever the live
   library list loads (title/progress drift).
7. Verify end-to-end with DevTools offline mode (or the agent-browser offline
   tool): download a book → go offline → reload the app → library shows the
   book with banner → open it → read pages → progress persists → go online →
   progress PATCHes once.

## Files you OWN
- `apps/web/src/lib/offline-store.ts` (new), `use-hydrate-book.ts`,
  `library-api.ts`, `use-progress-sync.ts`, `use-library.ts`
- Library UI: `src/library/*`, `src/routes/home.tsx` (toggle, banner, storage,
  disabled states)
- `src/store/reader-store.ts` only if a small flag (e.g. "opened offline") is
  genuinely needed.

## Files you must NOT touch
- `apps/api/**` — offline is a pure client feature; the API contract is frozen.
- Reader renderers (`src/reader/pdf/`, `src/reader/epub/`) — they already
  consume an in-memory `File`; the seam is upstream.
- Brief 19's service-worker config beyond what's strictly required (the book
  files live in IndexedDB, not the SW cache).

## Acceptance
- A downloaded book opens and reads fully offline after an app reload
  (hard requirement — verified with browser offline mode, both PDF and EPUB).
- Library page offline shows downloaded books + banner; upload/delete/convert
  clearly disabled offline, functional online.
- Offline reading progress survives reload and syncs last-write-wins on
  reconnect; no PATCH spam.
- Remove-download frees the storage; storage-used indicator reflects it.
- design.md conformance checklist passes for all new UI; typecheck + build clean.

## Outcome (2026-07-16) — done

Shipped, built as two laned chunks (core lib + library UI) and E2E-verified in
a real browser (both formats). `offline-store.ts`: hand-rolled typed IndexedDB
wrapper (`ebook-reader:offline` **v2** — `books` metadata / `files` blobs /
`progress` local rows, split so snapshot refreshes and listings never touch
blobs; v1→v2 migration moves existing blobs and was exercised live against a
2-book profile). Hydrate seam opens downloaded books from the stored blob with
zero network; `useLibraryList` falls back to cached rows + `isOffline`;
`useOfflineDownload` drives the per-cover toggle (top-left, mirroring the
format badge) with progress/remove/error-retry; offline banner, storage caption
in the header, upload/delete disabled offline ("Requires connection"). Progress:
every debounced tick also writes the local row; `useReconnectProgressSync`
flushes pending rows once on start/`online` (in-flight latch + stable array
refs — a live-confirmed 3×-duplicate-PATCH bug was found by review and fixed;
re-verified at exactly 1 PATCH). Resume prefers a pending local row so a
snapshot refresh can't shadow offline reading position. Wire contract exposes
no per-user progress timestamp, so pending-ness is tracked locally
(`updatedAt > syncedAt`) — flagged in case the API ever returns `updated_at`.
Full offline E2E: download → offline reload → banner + covers → EPUB opens,
pages, resumes at exact CFI → PDF opens → reconnect syncs once. No convert
affordance exists in the library UI, so "convert disabled offline" was N/A.
Typecheck + build clean; Quiet Paper checklist passed (no raw hex, Inter UI
roles, tonal elevation, accent unused).
