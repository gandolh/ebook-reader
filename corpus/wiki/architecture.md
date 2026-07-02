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

**Reading (100% client-side, no backend):**
```
file drop → detect ext/MIME (Zod) → PDF? → react-pdf viewer
                                   → EPUB? → fork: Read (react-reader) | Convert
```

**Conversion (the only backend interaction):**
```
web: EPUB multipart ──POST /convert──► api: validate (Zod) → spawn Calibre
                                              ebook-convert (temp files, 60s cap)
     Download + Go back ◄── PDF stream ◄──── stream result, cleanup in finally
```

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
- Single route `POST /convert`. Stateless — never persists or serves files.
- Shells out to Calibre `ebook-convert` via child process.

## Client↔server wiring
Web calls `VITE_API_URL` (`http://localhost:3001`) directly; Fastify enables
CORS. No Vite proxy.

See [reader.md](reader.md) and [conversion.md](conversion.md) for the two
subsystems in detail.
