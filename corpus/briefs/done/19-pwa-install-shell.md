# Task 19 — PWA phase 1: installable app + cached shell

## Context (2026-07-16)
The web app is a plain Vite 6 + React SPA — no manifest, no service worker,
emoji-data-URI favicon in [apps/web/index.html](../../../apps/web/index.html).
User approved making it a PWA in two phases; this brief is phase 1
(installability + shell caching). Phase 2 (offline reading) is brief 20 and
builds on the service worker registered here.

Load-bearing constraints from the code:
- `vite.config.ts` serves under a configurable sub-path: `base: env.BASE_PATH ?? "/"`.
  The manifest (`start_url`, `scope`, icon paths) and service-worker scope MUST
  respect that base — do not hardcode `/`.
- The API is **cross-origin** (`VITE_API_URL`, bearer auth in
  [api-client.ts](../../../apps/web/src/lib/api-client.ts)). Phase 1 does NOT
  cache general API responses — auth + freshness stay server-driven.
- Cover thumbnails (`GET <api>/library/:id/cover?token=…`) are immutable per
  book and fetched via `<img>`: the one API surface phase 1 runtime-caches.

## What to do
1. Add `vite-plugin-pwa` (devDependency of `apps/web`) and configure it in
   `apps/web/vite.config.ts`:
   - Manifest: name "Ebook Reader" (short_name "Ebooks"), `display: "standalone"`,
     theme/background colors from the Quiet Paper tokens in
     [wiki/design.md](../../wiki/design.md) — pull the actual hex values from the
     token definitions; manifest JSON is the one place raw hex is acceptable.
   - Icons: 192, 512, and 512-maskable PNGs with a book identity consistent with
     the current 📖 favicon and Quiet Paper (generate simple flat PNGs — an SVG
     book glyph on the paper background color rendered to PNG is fine; commit the
     PNGs under `apps/web/public/`). Also add an `apple-touch-icon`.
   - Precache the built shell (JS/CSS/HTML/fonts/icons) via generateSW. Mind the
     font payload — raise `maximumFileSizeToCacheInBytes` only if a chunk needs it.
   - `registerType: "prompt"`.
2. Update flow: a small "New version available — Reload" toast using
   `virtual:pwa-register/react` (`useRegisterSW`). Style per design.md (theme
   tokens only, Inter UI role, quiet elevation); mount it in the root layout
   [root-layout.tsx](../../../apps/web/src/routes/root-layout.tsx).
3. Runtime caching rule for cover thumbnails only: stale-while-revalidate on
   `<VITE_API_URL>/library/*/cover*` (cross-origin URL pattern — build it from
   the env at config time), with a sane max-entries cap (e.g. 200).
4. `index.html`: `theme-color` meta + manifest/icon links (the plugin injects
   most of this — verify the emitted HTML).
5. Verify: `npm run build -w @ebook-reader/web` clean; `vite preview` serves a
   manifest that passes DevTools' installability check; service worker activates;
   second load of the shell is served from cache; a changed build triggers the
   reload prompt.

## Files you OWN
- `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/public/*` (new)
- `apps/web/package.json` (the one new devDependency)
- New toast component + its mount point in `apps/web/src/routes/root-layout.tsx`
- `apps/web/src/vite-env.d.ts` (pwa-register types if needed)

## Files you must NOT touch
- `apps/api/**` — no server changes in this phase.
- Reader/library data flow (`lib/*.ts`, `store/`) — offline reading is brief 20.
- Type roles / tokens in [wiki/design.md](../../wiki/design.md) (D27).

## Acceptance
- App is installable (Chrome install prompt / Add to Home Screen) with correct
  name, icons, standalone display, and works when served under a non-root
  `BASE_PATH`.
- Shell loads from the service worker cache on repeat visits; cover thumbnails
  are stale-while-revalidate; **no other API traffic is cached**.
- New deploys surface the design-conformant reload toast (no silent staleness,
  no stuck-on-old-version).
- design.md conformance checklist passes for the toast; typecheck + build clean.

## Outcome (2026-07-16) — done

Shipped. `vite-plugin-pwa@1.3.0` (generateSW) in `vite.config.ts`: manifest
(Quiet Paper `#fcf9f8` theme/background — the one allowed raw-hex site), 4
committed icon PNGs (192/512/maskable/apple-touch, faded-ink book glyph),
precache of the full shell **including the pdf.js `.mjs` worker** (globPatterns
gained `mjs` — reader works offline; precache ~3 MB / 34 entries after the
duplicate-icon fix), `registerType: "prompt"` + `UpdateToast` (`useRegisterSW`,
mounted in `root-layout.tsx` outside the auth gate), and a
stale-while-revalidate runtime cache for cover thumbnails only (max 200,
pattern derived from the `VITE_API_URL` **origin**). All scope/start_url/
navigateFallback derive from `BASE_PATH` (normalized to a trailing slash) —
verified with a non-root base build. E2E-verified in a real browser: SW
registers + controls, offline reload serves the shell, update toast appeared on
the next deploy and `Reload` activated it. Typecheck + build clean.
