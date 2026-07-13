---
summary: The EPUB→PDF export path — the single stateless Fastify /convert route backed by Calibre ebook-convert, with its limits and error shape.
updated: 2026-07-02
---

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

## Frontend flow (2026-07-02: moved into the reader)
The uploader no longer forks — EPUBs open straight in the reader. Conversion is
a **secondary "Download as PDF" toolbar button** in the EPUB reader:
`useMutation(POST /convert)` → spinner on the button while converting → browser
download of the PDF on success → transient error notice on failure. Still no
in-app reading of the converted PDF; to read it, re-upload (D1 detail in
[decisions.md](decisions.md)).

## Wiring
Web → `VITE_API_URL` (`http://localhost:3001`) with CORS (`@fastify/cors`). No
Vite proxy (D14).
