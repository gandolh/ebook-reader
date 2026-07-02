# TP-04 — EPUB→PDF conversion (live Calibre)

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).
Fixture: the Apothecary EPUB. Requires `ebook-convert` on PATH.

## Goal
The only backend flow works end-to-end: upload EPUB → convert → download a
valid PDF. Closes the "live conversion unverified" open question.

## Cases
1. **Health** — `GET :3001/health` returns ok before starting.
2. **Convert** — upload EPUB → fork → "Convert to PDF" → in-flight "Converting…"
   state visible (screenshot during) → success panel with `<name>.pdf`.
3. **Download** — Download button produces a file; verify it is a real PDF
   (magic bytes `%PDF`, size > 100KB for this book).
4. **Go back** — returns to the idle dropzone; can start another flow.
5. **Server-side validation** — POST a non-EPUB to `/convert` directly → 4xx
   with a structured error, not a crash.
6. **Concurrent sanity** — server stays healthy after the conversion (health
   check again; temp files cleaned up).

## Pass criteria
A real, openable PDF comes back; errors are structured; no orphan temp files.
