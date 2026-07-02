# Overview

**ebook-reader** is a personal, single-user, **stateless** ebook reader.

Upload a file → read it → it's gone on refresh. No accounts, no persistence, no
library, no reading-progress storage. Reading state (current page, font size,
theme) lives in Zustand in memory and resets on refresh — that's intended.

## What it does
1. **Read PDF** — upload → renders client-side via `react-pdf` (PDF.js).
2. **Read EPUB** — upload → renders natively client-side via `react-reader`
   (epub.js), reflowable, Kindle-style.
3. **Convert EPUB→PDF** — upload EPUB → backend shells out to Calibre → PDF
   streams back as a **download**. To read that PDF, the user re-uploads it.

## The cast (monorepo, npm workspaces)
- **`apps/web`** — React + Vite frontend. The heart of the app (the reader).
- **`apps/api`** — Node + Fastify backend. One stateless route: `POST /convert`.
- **`packages/shared`** — Zod schemas + inferred TS types (the convert contract
  + file validation), imported by both apps so they can't drift.

## The honest tension we settled
EPUB→PDF conversion *discards* reflow (EPUB's best trait), so it is strictly an
**export/download** utility — never the primary reading path. Native EPUB
reading stays the star. See [decisions.md](decisions.md).

## Runs
Local dev only. `npm run dev` runs web + api. Calibre must be installed on the
host (the backend warns loudly on startup if `ebook-convert` is missing).
