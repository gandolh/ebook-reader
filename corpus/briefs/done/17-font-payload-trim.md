# Task 17 — Trim the self-hosted font payload

## Context (measured — 2026-07-13, production `vite build`)
The build ships **920 KB of font files**: 412 KB woff2 (28 files) + **508 KB
legacy woff (28 files)**, covering three families (Playfair Display, Source
Serif 4, Inter) × weights 400/500/600/700 × unicode subsets latin, latin-ext,
cyrillic, cyrillic-ext, greek, greek-ext, vietnamese.

Two clear inefficiencies for an English-first reading app:
- **Legacy `.woff` (508 KB)** is a fallback for browsers that don't support
  woff2 — essentially none in the app's target range. It's dead weight in the
  build (and a stale-fallback risk).
- **Non-latin subsets** (cyrillic/greek/vietnamese ≈ the bulk beyond the ~116 KB
  latin woff2) are downloaded only when content hits those unicode ranges, so
  they rarely cost real users — but they bloat the build and the deploy.

(Note: `unicode-range` already means browsers fetch only needed subsets at
runtime, and prefer woff2 — so the *real-user* download is smaller than 920 KB.
This is about trimming what's shipped/served and dropping the legacy format.)

## Files you OWN
- Wherever the fonts are imported — likely `@fontsource*` imports in
  [apps/web/src/styles/globals.css](../../../apps/web/src/styles/globals.css) or `main.tsx`.
- `apps/web/vite.config.ts` if font handling needs build config.

## Files you must NOT touch
- The type-role decisions in [wiki/design.md](../../wiki/design.md) (D27) — Playfair / Source Serif 4 / Inter and their weights are the enforced design system. **Do not drop a family or a weight the design uses.** This brief trims *formats and subsets*, not the type system.

## What to do
1. Confirm how fonts are imported and which weights/subsets the design actually uses (cross-check design.md).
2. **Drop the legacy `.woff`**, keeping woff2 only (verify against the app's browser targets first).
3. **Import only the subsets the app needs** (latin + latin-ext at minimum; add others only if real content requires them) instead of the full `@fontsource` family.
4. Re-run `npm run build` and record the new font total vs 920 KB.

## Acceptance
- Font build payload materially reduced (target: drop the 508 KB legacy woff + unused subsets), with the before/after numbers in the outcome note.
- All design.md type roles still render correctly (Playfair display, Source Serif reading, Inter UI) in light/sepia/dark.
- `npm run build` clean; visual check of the library + reader.

## Outcome (2026-07-13) — done

Shipped. Switched `main.tsx` from full-family `@fontsource/*/<weight>.css` to per-subset `latin-*`/`latin-ext-*` imports at the SAME families+weights (Playfair 600/700, Source Serif 4 400, Inter 500/600). **Font build payload 920 KB → 544 KB (−41%)**; cyrillic/greek/vietnamese subsets no longer emitted. Legacy `.woff` (508→304 KB) kept — dropping it cleanly would need adding `sass` (fontsource SCSS mixins), which violates the no-new-deps rule; flagged as a follow-up. design.md type roles verified intact. Build clean.
