---
summary: How the app is put together — the npm-workspaces monorepo (web/api/shared), layer boundaries, the auth guard, and the upload→store→read data flow.
updated: 2026-07-13
---

# Architecture

## Monorepo (npm workspaces)

```
ebook-reader/
  package.json            root — workspaces + orchestration scripts
  apps/
    web/                  React + Vite frontend
    api/                  Node + Fastify backend
  packages/
    shared/               Zod schemas + inferred TS types
```

Root `package.json` declares `workspaces: ["apps/*", "packages/*"]`. Scripts run
each workspace (e.g. `npm run dev` runs web + api concurrently). Plain npm — no
pnpm, no Turborepo. TypeScript throughout.

## Dependency direction
```
apps/web  ─┐
           ├─►  packages/shared   (Zod contract + types)
apps/api  ─┘
```
`packages/shared` depends on nothing internal. Neither app depends on the other.

## Data flow

**Library (D24–D26) — the new front door:**
```
web: file upload ──POST /library──► api: validate (Zod) → store original on disk
                                          → extract cover (EPUB OPF / PDF pg1)
                                          → write thumbnail to images/thumbnails/
                                          → INSERT book row (SQLite)
     gallery of cover cards ◄─GET /library─◄ list rows (metadata only)
     cover img ◄──GET /library/:id/cover──◄ stream file from disk
     open to read ◄─GET /library/:id/file─◄ stream original from disk → reader
     progress saved ──PATCH /library/:id/progress──► UPSERT caller's reading_progress row (D31)
     remove ──DELETE /library/:id──► delete row + file + thumbnail
```

**Auth (D30) — an `onRequest` guard in front of everything:**
```
web login ──POST /auth/login (username+password)──► verify scrypt hash → mint session token
     every request ──Bearer <token> / ?token=<token>──► guard resolves session → request.authUser
     (allowlist: POST /auth/login, GET /auth/status, GET /health, OPTIONS)  else → 401
```

**Reading (100% client-side once the file is fetched):**
```
open library book → GET /library/:id/file → PDF?  → react-pdf viewer
                                           → EPUB? → react-reader viewer
```

**Conversion (unchanged, still stateless):**
```
web: EPUB multipart ──POST /convert──► api: validate (Zod) → spawn Calibre
                                              ebook-convert (temp files, 60s cap)
     Download ◄── PDF stream ◄──── stream result, cleanup in finally
```

## Server-side storage (D25)
```
apps/api/
  data/library.db            SQLite (better-sqlite3) — books, users, sessions, reading_progress
  library/<id>.<ext>         original uploaded PDF/EPUB files
  images/thumbnails/<id>.jpg extracted cover thumbnails
```
`data/`, `library/`, `images/` are **gitignored**. The DB stores only paths +
metadata; image/file bytes live on disk (cheap HTTP serving + small DB).

Tables (`db.ts`):
- `books`: `id, title, author, format, file_path, cover_path, size_bytes,
  progress, created_at, last_opened_at` — shared library (the `progress` column
  is legacy; per-user progress lives in `reading_progress`).
- `users`: `id, username (unique), password_hash (scrypt), created_at` —
  operator-seeded accounts (D30).
- `sessions`: `token PK, user_id → users ON DELETE CASCADE, created_at` — opaque
  login sessions (D30).
- `reading_progress`: `(user_id, book_id) PK` → `progress, locator, updated_at`,
  both FKs `ON DELETE CASCADE` — per-user progress + resume position (D31).

## Frontend stack (`apps/web`)
- **TanStack Router** — routes between views (home/upload ↔ reader).
- **TanStack Query** — `useMutation` wrapping `POST /convert` (loading/error/success).
- **Zustand** — in-memory reader state (current page, theme, font settings).
- **Zod** — client-side file validation (shared schemas).
- **Tailwind** + **Base UI** (`@base-ui/react`) — styling + unstyled accessible
  primitives (drawer, popover, slider, tabs) for the reader chrome.
- **react-pdf** (PDF.js) — PDF rendering.
- **react-reader** (epub.js) — EPUB rendering.

## Backend stack (`apps/api`)
- **Fastify** + `@fastify/multipart` (upload) + `@fastify/cors`.
- **`better-sqlite3`** (D24) — synchronous single-file DB for the library.
- **Library routes** (D24): `POST /library`, `GET /library`,
  `GET /library/:id/file`, `GET /library/:id/cover`,
  `PATCH /library/:id/progress`, `DELETE /library/:id`.
- **Auth** (D30, `auth.ts` + `password.ts`): app-wide `onRequest` guard +
  `POST /auth/login` / `GET /auth/status` / `POST /auth/logout`; scrypt password
  hashing; opaque sessions. Accounts seeded by `scripts/seed.ts` (no
  self-registration). Per-user reading progress (D31) via `reading_progress`.
- **Cover extraction** (D26): EPUB OPF manifest cover; PDF page-1 render → JPEG.
- `POST /convert` — unchanged, still stateless; shells out to Calibre
  `ebook-convert` via child process.

## Client↔server wiring
Web calls `VITE_API_URL` (`http://localhost:3001`) directly; Fastify enables
CORS. No Vite proxy.

See [reader.md](reader.md) and [conversion.md](conversion.md) for the two
subsystems in detail.
