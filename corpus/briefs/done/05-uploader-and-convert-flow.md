# Task 05 — Smart uploader + convert flow

## Context
The entry screen and the EPUB→PDF convert UX. See [reader.md](../../wiki/reader.md)
(entry) and [conversion.md](../../wiki/conversion.md) (flow).

## Files you OWN
- `apps/web/src` — the uploader/home view, the convert mutation + result UI

## Files you must NOT touch
- `apps/api/**`, `packages/shared/**` (import only)
- The reader view internals (briefs 06/07 own those)

## What to do
1. **Smart uploader:** one dropzone (drag + click). On file, detect type via the
   shared classifier (ext/MIME).
   - **PDF** → route to `/read` with the file loaded as a PDF.
   - **EPUB** → present a fork: **Read** (route to `/read` as EPUB) or **Convert
     to PDF**.
   - Invalid type → inline friendly error.
2. **Convert flow:** on "Convert to PDF", call `POST /convert` via TanStack Query
   `useMutation` (multipart). Show loading state.
   - **Success:** show two buttons — **Download** (save the returned PDF blob) +
     **Go back** (return to uploader). No in-app reading of the result (D1).
   - **Error:** render the structured error's message ("Conversion failed", etc.).
3. Keep the loaded file in memory (Zustand / router state) to hand to the reader.

## Acceptance
- Dropping a PDF opens the PDF reader; dropping an EPUB shows Read/Convert.
- Convert shows loading → Download + Go back on success; friendly message on
  each error code.
- Download saves a valid PDF; Go back returns to the uploader.

---
## Outcome [2026-07-02]
Shipped. `home.tsx` = dropzone (native drag/drop + click-to-browse) → `detectFileType`
→ PDF navigates `/read?format=pdf`; EPUB forks Read | Convert to PDF | Cancel.
`convert-api.ts` POSTs multipart via `useMutation`, parses shared `convertErrorSchema`
into friendly per-code messages (`CONVERT_ERROR_MESSAGES`). Success → Download (blob
object-URL) + Go back. File handed to reader via additive Zustand `loadedFile`/
`loadedFormat` + `setLoadedFile` (a `File` isn't serializable into a search param;
router.tsx untouched). No deps added. Verified: typecheck ×3, Vite build, live API
convert (CALIBRE_MISSING + INVALID_FILE friendly errors, CORS 204 preflight). UI
drag/drop not visually exercised (no browser tool) — checked via contract + code trace.
