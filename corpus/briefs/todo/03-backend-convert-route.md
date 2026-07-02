# Task 03 — Backend `/convert` route

## Context
The only backend feature. Stateless Fastify route wrapping Calibre. See
[conversion.md](../../wiki/conversion.md).

## Files you OWN
- `apps/api/src/**` (server bootstrap, the `/convert` route, Calibre wrapper,
  temp-file helpers, startup check)

## Files you must NOT touch
- `packages/shared/**` (import the schemas; don't redefine)
- `apps/web/**`

## What to do
1. Fastify bootstrap on `PORT` (default 3001). Register `@fastify/cors`
   (permissive) and `@fastify/multipart` with the 50MB limit from `MAX_UPLOAD_MB`.
2. **Startup check:** verify `ebook-convert` is on PATH; if missing, log a loud
   warning (don't crash).
3. `POST /convert`:
   - Read the multipart file; validate MIME/size with the shared Zod schema →
     structured error on failure (`INVALID_FILE` / `TOO_LARGE`).
   - Write to a temp `.epub`, spawn `ebook-convert in.epub out.pdf` as a child
     process with a **60s timeout** (`CONVERT_TIMEOUT_MS`); kill on timeout →
     `TIMEOUT` error. Non-zero exit → `CONVERT_FAILED`. Calibre absent → `CALIBRE_MISSING`.
   - On success stream `out.pdf` back with `Content-Disposition: attachment;
     filename="<name>.pdf"`.
   - **Cleanup temp files in `finally`** (both paths).
4. No queue, no persistence — never keep or serve files after the response.

## Acceptance
- `POST /convert` with a valid EPUB returns a PDF stream.
- Oversize / non-EPUB / bad-EPUB / timeout each return the correct structured
  error and clean up temp files.
- Server boots and warns (not crashes) when Calibre is absent.
- `npm run typecheck` clean.
