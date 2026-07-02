# Task 01 — Monorepo scaffold

## Context
Greenfield repo (only `README.md`). Stand up the npm-workspaces monorepo per
[architecture.md](../../wiki/architecture.md) so all later briefs have a home.

## Files you OWN
- `package.json` (root — workspaces + scripts)
- `apps/web/package.json`, `apps/api/package.json`, `packages/shared/package.json`
- `tsconfig.base.json` (shared TS config) + a `tsconfig.json` per workspace
- `.gitignore`, `.env.example`
- placeholder `src/index.ts` in each workspace so they build

## Files you must NOT touch
- `corpus/**`

## What to do
1. Root `package.json`: `"private": true`, `"workspaces": ["apps/*", "packages/*"]`,
   and scripts: `dev` (run web + api concurrently — use `concurrently` or `npm-run-all`),
   `build`, `typecheck` (run across workspaces).
2. `packages/shared`: TS library, builds to `dist`, exports from `src/index.ts`.
   Depend on `zod`. Both apps will import it as `@ebook-reader/shared` (or chosen
   scope) via workspace protocol.
3. `apps/api`: Fastify app skeleton, TS, dev via `tsx watch` on port 3001.
4. `apps/web`: Vite + React + TS skeleton (scaffold minimal — brief 04 fleshes it out).
5. `tsconfig.base.json` with strict settings; each workspace extends it.
6. `.env.example` with `VITE_API_URL=http://localhost:3001` and API `PORT=3001`,
   `MAX_UPLOAD_MB=50`, `CONVERT_TIMEOUT_MS=60000`.
7. `.gitignore` for `node_modules`, `dist`, `.env`, Vite/build artifacts.

## Acceptance
- `npm install` at root wires all workspaces.
- `npm run typecheck` passes across all three.
- `npm run dev` starts web (Vite) and api (Fastify on :3001) together.
- `packages/shared` is importable from both apps.

---
## Outcome [2026-07-02]
Shipped as specified. npm workspaces `@ebook-reader/{web,api,shared}`; React 19 +
Vite 6 (no Tailwind yet), Fastify 5 (`tsx watch`, `/health` route, port 3001),
shared = zod lib. `npm install` (0 vulns), `npm run typecheck` passes across all
three; shared resolves in both apps. **Deferred:** `packages/shared/dist` is
gitignored, so a cold clone needs `npm run build` before a bare typecheck resolves
shared's `.d.ts` (root `build` covers normal flow). Revisit if it bites.
