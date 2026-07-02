# Log

## [2026-07-02] decision | Corpus bootstrapped + full spec ingested

Bootstrapped `corpus/` for the ebook-reader project. Folded the finalized spec
from the grill session into the wiki (overview, architecture, decisions, reader,
conversion, status, open-questions). Filed briefs 01–07 covering the full
implementation plan. See [wiki/overview.md](wiki/overview.md).

## [2026-07-02] decision | Tailwind v4 locked (D20)

Resolved the open Tailwind-version question in favor of **Tailwind v4** (matches
Base UI's documented examples). Removed from open-questions; recorded as D20 in
[wiki/decisions.md](wiki/decisions.md). Build to run all waves autonomously.

## [2026-07-02] done | Brief 01 — monorepo scaffold

npm-workspaces monorepo stood up: `@ebook-reader/{web,api,shared}`. React 19 +
Vite 6, Fastify 5 (`tsx watch`, port 3001, `/health`), shared = zod lib. Verified:
`npm install` clean, `npm run typecheck` passes across all three, shared resolves
in both apps. Deferred: gitignored `shared/dist` needs a build before cold-clone
typecheck. See [briefs/done/01-monorepo-scaffold.md](briefs/done/01-monorepo-scaffold.md).

## [2026-07-02] done | Brief 02 — shared Zod contract

`packages/shared` now the source of truth: `detectFileType`, size guards,
`convertRequestSchema` (EPUB-only), `convertErrorSchema` (`{error, code}` union).
Legacy `SUPPORTED_FORMATS`/`Format` preserved for the apps. Typecheck passes.
See [briefs/done/02-shared-zod-contract.md](briefs/done/02-shared-zod-contract.md).

## [2026-07-02] decision | Pin exact dependency versions (D21)

User: all deps pinned exact (no `^`/`~`), latest stable. Retrofitted root +
`packages/shared` to installed versions (concurrently 9.2.3, typescript 5.9.3,
zod 3.25.76). In-flight briefs 03/04 told to pin what they add. Recorded as D21.

## [2026-07-02] done | Brief 03 — backend /convert route

Stateless Fastify `POST /convert` (config/calibre/temp-files/convert-route modules).
Validates via shared schemas, spawns `ebook-convert` with 60s timeout, streams PDF
as attachment, cleans temp in `finally`. Error→HTTP mapping wired to shared
`convertErrorSchema`. Deps pinned (`@fastify/cors 11.2.0`, `@fastify/multipart 10.0.0`),
`fastify` pinned to 5.9.0. Verified except live conversion (Calibre absent on dev box).
See [briefs/done/03-backend-convert-route.md](briefs/done/03-backend-convert-route.md).

## [2026-07-02] done | Brief 04 — frontend shell

Vite+React shell: code-based TanStack Router (`/`, `/read`), Query provider,
Zustand reader store, Tailwind v4 (theme tokens), Base UI Dialog proven, api
client reading `VITE_API_URL`. Base UI package confirmed `@base-ui/react@1.6.0`
(D22). All web deps pinned exact; Node pinned ≥22 / `.nvmrc` 22.23.1 (D23).
Wave 3 complete. See [briefs/done/04-frontend-shell.md](briefs/done/04-frontend-shell.md).
