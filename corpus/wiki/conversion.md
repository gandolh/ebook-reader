# Conversion (EPUB→PDF)

The only backend feature. A single stateless Fastify route.

## Route: `POST /convert`
- **In:** multipart EPUB upload (`@fastify/multipart`).
- **Validate:** Zod (shared schema) — MIME string + file size. Reject non-EPUB
  and oversize early with a structured error.
- **Convert:** write upload to a temp file, spawn Calibre `ebook-convert
  <in.epub> <out.pdf>` as a child process.
- **Out:** stream the produced PDF back with `Content-Disposition: attachment`.
- **Cleanup:** remove temp files in a `finally` (both success and failure).

## Limits & robustness (D15)
- **Max upload:** 50MB (configurable via env).
- **Timeout:** 60s — kill the runaway `ebook-convert` child, return a 504-ish
  structured error.
- **Failure UX:** catch child-process errors (non-zero exit, bad EPUB, Calibre
  missing) → structured Zod-typed JSON error → frontend `useMutation` shows a
  friendly "Conversion failed" message.
- **Startup check:** verify `ebook-convert` is on PATH; warn loudly if not.
- **Concurrency:** no queue — single-user, requests just run.

## Frontend flow
Upload EPUB → `useMutation(POST /convert)` → on success, present **Download**
(save the PDF) + **Go back** (return to uploader). No in-app reading of the
converted PDF; to read it, re-upload (D1 detail in [decisions.md](decisions.md)).

## Wiring
Web → `VITE_API_URL` (`http://localhost:3001`) with CORS (`@fastify/cors`). No
Vite proxy (D14).
