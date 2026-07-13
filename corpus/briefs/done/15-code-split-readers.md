# Task 15 — Code-split / lazy-load the PDF and EPUB readers

## Context (measured — 2026-07-13, production `vite build`)
The web app ships as **one monolithic JS chunk: `index-*.js` = 1,418.94 kB
(gzip 434 kB)**, and Vite emits the >500 kB chunk warning. Root cause:
[apps/web/src/routes/read.tsx](../../../apps/web/src/routes/read.tsx#L7-L8)
statically imports **both** readers at module top:

```ts
import { PdfReader } from "../reader/pdf";
import { EpubReader } from "../reader/epub";
```

So `pdf.js` **and** `epub.js` are bundled into the initial download for **every**
user — including on the library home, before any book is opened, and regardless
of which single format they read. (The 1,046 kB `pdf.worker.min` is already a
separate on-demand file — good — but the react-pdf/epubjs *main* code is not.)

This is the single biggest measured payload win: the library home needs neither
reader.

## Files you OWN
- [apps/web/src/routes/read.tsx](../../../apps/web/src/routes/read.tsx) — replace the static reader imports with `React.lazy(() => import(...))` + `<Suspense>` (reuse the existing opening/skeleton state as the fallback).
- [apps/web/src/reader/pdf/index.ts](../../../apps/web/src/reader/pdf/index.ts) and [apps/web/src/reader/epub/index.ts](../../../apps/web/src/reader/epub/index.ts) — ensure they support a clean dynamic import boundary (default or named export that lazy can target).
- Optionally `apps/web/vite.config.ts` — `build.rollupOptions.output.manualChunks` to split `pdfjs-dist`/`react-pdf` and `epubjs`/`react-reader` into their own chunks if `React.lazy` alone doesn't cleanly separate them.

## Files you must NOT touch
- Reader internals (rendering logic) — this is purely the import boundary.
- The pdf worker setup ([pdf-worker.ts](../../../apps/web/src/reader/pdf/pdf-worker.ts)) — it already loads on demand.

## What to do
1. Lazy-import `PdfReader` and `EpubReader` in `read.tsx`; wrap the mounted reader in `<Suspense>` with a sensible fallback (the existing `OpeningState`/skeleton).
2. Verify the build produces separate chunks for each reader (and its heavy dep), and the initial/library chunk no longer contains pdf.js/epub.js.
3. Re-measure: record the new initial chunk size vs the 1,418.94 kB baseline in the outcome note.

## Acceptance
- `npm run build` shows the reader libraries in **separate chunks**, not the entry chunk; the >500 kB warning is gone or materially reduced.
- Opening a PDF loads the PDF chunk; opening an EPUB loads the EPUB chunk; the library home loads neither.
- Measured initial-JS reduction recorded (target: roughly half of the 434 kB gzip, since each reader's deps are a large share).
- `npm run typecheck` clean; both readers still open and function.

## Outcome (2026-07-13) — done

Shipped. `read.tsx` now loads both readers via `React.lazy(() => import(...).then(m => ({default: m.X})))` wrapped in `<Suspense>` (fallback = existing OpeningState). Rollup auto-split them — no manualChunks needed, barrels kept named exports. **Measured: entry JS 1,418.94 kB → ~407 kB (gzip 434 → 123 kB)**; PDF reader (~475 kB) and EPUB reader (~411 kB) are now separate chunks loaded only when a book of that format opens; the library home loads neither. Vite >500 kB warning gone. Review fix: added `ReaderChunkErrorBoundary` so a failed chunk load (stale deploy/flaky net) shows the recoverable OpeningError UI instead of crashing. Verified live by brief 18 (initial transfer = entry chunk only).
