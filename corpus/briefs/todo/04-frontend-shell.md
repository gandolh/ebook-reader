# Task 04 — Frontend shell

## Context
Flesh out `apps/web`: Vite + React app with routing, data layer, styling, and
the state store, ready for the uploader and readers. See
[architecture.md](../../wiki/architecture.md).

## Files you OWN
- `apps/web/**` (Vite config, `main.tsx`, router setup, Query client, Zustand
  store skeleton, Tailwind + Base UI setup, global styles, app shell)

## Files you must NOT touch
- `apps/api/**`, `packages/shared/**` (import only)

## What to do
1. **TanStack Router** — routes: `/` (home/upload) and `/read` (reader shell).
   Type-safe params for the loaded file / format.
2. **TanStack Query** — `QueryClientProvider` at the root (the convert
   `useMutation` lands in brief 05).
3. **Zustand** — in-memory reader store skeleton: theme, font settings, current
   location/page, chrome visibility, layout mode (fields; readers wire them up).
4. **Tailwind** — configure (resolve v3 vs v4 — see
   [open-questions.md](../../wiki/open-questions.md)); base theme tokens
   (light/sepia/dark) as CSS vars for later use.
5. **Base UI** — install `@base-ui/react`; prove one primitive renders (e.g. a
   Dialog) so drawer/popover/slider are ready for the reader chrome.
6. API client util reading `VITE_API_URL`.

## Acceptance
- `npm run dev` serves the web app; `/` and `/read` route.
- Tailwind classes apply; a Base UI Dialog opens.
- Zustand store + Query provider are in place.
- Typecheck clean; shared package imports resolve.
