# Overview

**ebook-reader** is a personal, single-user ebook reader with a **persistent
library**.

Upload a PDF or EPUB → it's saved and appears as a cover card in your library →
reopen and read it anytime. No accounts (D2). The library (files + extracted
covers + progress) persists server-side in SQLite (D24). Reading *position*
(current page/CFI) and view state (font size, theme) still live in Zustand in
memory and reset on refresh — that's intended (D9).

## What it does
1. **Library home** — upload a PDF/EPUB → backend stores the file, extracts a
   cover, inserts a row → the book shows as a cover card in a gallery. Reopen
   anytime; delete when done. This is the front door (was: one-step uploader).
2. **Read PDF** — open a library book → renders client-side via `react-pdf`
   (PDF.js).
3. **Read EPUB** — open a library book → renders natively client-side via
   `react-reader` (epub.js), reflowable, Kindle-style.
4. **Convert EPUB→PDF** — from the EPUB reader → backend shells out to Calibre →
   PDF streams back as a **download**.

## The cast (monorepo, npm workspaces)
- **`apps/web`** — React + Vite frontend. The heart of the app (the reader).
- **`apps/api`** — Node + Fastify backend. Owns the **library** (SQLite CRUD +
  file/cover storage on disk) and the stateless `POST /convert` route.
- **`packages/shared`** — Zod schemas + inferred TS types (convert contract +
  file validation + library book contract), imported by both apps so they can't
  drift.

## The honest tension we settled
EPUB→PDF conversion *discards* reflow (EPUB's best trait), so it is strictly an
**export/download** utility — never the primary reading path. Native EPUB
reading stays the star. See [decisions.md](decisions.md).

## Runs
Local dev only. `npm run dev` runs web + api. Calibre must be installed on the
host (the backend warns loudly on startup if `ebook-convert` is missing).
