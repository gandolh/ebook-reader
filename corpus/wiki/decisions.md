# Decisions (locked)

Settled choices from the grill session. Don't relitigate without an explicit
revisit + a `log.md` note.

| # | Decision | Rationale |
|---|---|---|
| D1 | **EPUB→PDF is export-only**, never a reading path | Conversion discards reflow; native EPUB reading is superior |
| ~~D2~~ | ~~**Single-user, no auth**~~ **REVISED 2026-07-07 → D28** | Still single-user, still no accounts — but the public deployment is now gated behind one shared password (see D28). |
| ~~D3~~ | ~~**No persistence** — upload → read → gone on refresh~~ **REVISED 2026-07-07 → D24** | Superseded: the app now keeps a persistent **library** (server-side SQLite). Reading *position* is still session-only per D9. |
| ~~D4~~ | ~~**Backend = one stateless `/convert` route**~~ **REVISED 2026-07-07 → D24** | Superseded: backend now also owns the library (CRUD + file/cover storage). `/convert` still exists and is still stateless. |
| D5 | **Calibre `ebook-convert`** for conversion | Best fidelity; acceptable to require the binary for a personal app |
| D6 | **EPUB render = react-reader / epub.js** | De facto standard, React wrapper, fast to Kindle-like reflow |
| D7 | **PDF render = react-pdf (PDF.js)** | Clean React API, keeps custom chrome control |
| D8 | **TanStack Router + Query** | Router for views; Query `useMutation` for the one convert call |
| D9 | **Zustand** for in-memory reader state | Resets on refresh — intended |
| D10 | **Monorepo = npm workspaces** | No pnpm/Turborepo; `apps/web`, `apps/api`, `packages/shared` |
| D11 | **`packages/shared` holds Zod contract** | Single source of truth; client + server can't drift |
| D12 | **Formats = PDF + EPUB only** for v1 | Matches the two reading paths; MOBI/AZW3 deferred |
| D13 | **Detection = extension/MIME only** (no magic bytes) | Spoofing isn't a threat for a personal tool |
| D14 | **CORS + `VITE_API_URL`** (no Vite proxy) | Explicit base URL, deploy-ready |
| D15 | **Convert limits: 50MB / 60s / structured errors / no queue** | Sane defaults for single-user |
| D16 | **Tailwind + Base UI** | Fast chrome; unstyled accessible primitives keep the Kindle look |
| D17 | **Local dev only** — `npm run dev`, no Docker/deploy | Personal tool |
| D18 | **No bookmarks/highlights in v1** | Pointless without persistence |
| D19 | **In-book search IS in v1** | Kept during scoping |
| D20 | **Tailwind v4** (with `@base-ui/react`) | Matches Base UI's documented examples; greenfield 2026 build |
| D21 | **Pinned exact dependency versions** (no `^`/`~`), latest stable | Reproducible installs; ranges had already drifted (TS `^5.7.3`→5.9.3) |
| D22 | **Base UI = `@base-ui/react`** (not `@base-ui-components/react`) | `@base-ui/react@1.6.0` is current; the `-components` name is legacy/stuck |
| D23 | **Node ≥22** (`.nvmrc` 22.23.1, `engines` `>=22`) | Dev box is 22.23.1; pinned to installed version (no version manager present) |
| D24 | **Persistent library via SQLite in `apps/api`** (`better-sqlite3`) | Reverses D3. User wanted a saved library of covers. Single-user local file DB; synchronous API is simplest for one user. Still no auth (D2 holds). |
| D25 | **Thumbnails stored on disk**, not in the DB | `apps/api/images/thumbnails/<id>.jpg`; DB stores only the path. Keeps the DB small/fast, lets HTTP layer cache + serve covers cheaply. Originals live alongside at `apps/api/library/<id>.<ext>`. Both dirs gitignored. |
| D26 | **Covers extracted server-side** | EPUB: OPF manifest cover image. PDF: render page 1 to a JPEG thumbnail. Missing cover → typographic fallback tile in the UI (see design.md). |
| D27 | **`wiki/design.md` is the enforced design system** ("Quiet Paper") | Merged from the Stitch exploration + existing `--reader-*` tokens. All `apps/web` work must conform; conformance checklist lives in design.md and is enforced via CLAUDE.md. |
| D28 | **Platform password via `APP_PASSWORD` env** (brief 09; revises D2) | Single shared password, no accounts. API-enforced `onRequest` guard; stateless token = `sha256hex(password)` via `Authorization: Bearer` or `?token=` (cover `<img>`s can't send headers); token persisted in `localStorage`; ~~env unset → auth off + loud startup warning (dev stays frictionless)~~ **REVISED 2026-07-08 → D29: `APP_PASSWORD` is now required; there is no open mode**. Token redacted from request logs. No expiry/rate-limit/sessions — single-user tool. |
| D29 | **Env is validated + required at startup** (2026-07-08; revises D28's open mode) | All `.env` vars are now REQUIRED, not defaulted. The API validates them with a zod schema at import (`apps/api/src/config.ts`) and `vite.config.ts` checks `VITE_API_URL`; any missing/blank/malformed value aborts startup (`process.exit(1)` / thrown) with a clear message — no silent fallback. **Removes the old "`APP_PASSWORD` unset → API open" path** (the foot-gun that motivated this: the app booted open with an empty library and never prompted). Single root `.env`, loaded via `process.loadEnvFile` (API, best-effort so a process manager can inject vars instead) + Vite `envDir` (web); `.env.example` documents the full contract. Optional deploy overrides `LIBRARY_DATA_DIR`/`BASE_PATH` stay non-required. |

## After-conversion UX (D1 detail)
Two buttons only: **Download** (save the PDF) and **Go back** (return to
uploader). No "read in new tab" — to read a converted PDF, the user re-uploads
it (which routes through the normal PDF reading path).
