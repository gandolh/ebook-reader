# Status — 2026-07-02

**Phase:** implementation, waves 1–4 done. Uploader + PDF reader + shared chrome
landed. All deps pinned (D21); Node ≥22 (D23). Next: wave 5 (final).

## Where things stand
Spec locked in the wiki. Build running autonomously wave-by-wave. Briefs 01–06
done + verified (typecheck clean ×3, Vite build ok). Shared reader chrome built
with a format-adaptive toolbar seam for the EPUB reader to reuse. **Caveats:**
(1) backend live EPUB→PDF conversion unverified — Calibre not installed on dev box;
(2) readers not pixel-verified in a real browser — no headless browser installed
(see open-questions.md). Next: wave 5 = brief 07 (EPUB reader + search) — the last.

## Briefs
| # | Brief | State |
|---|---|---|
| 01 | Monorepo scaffold (npm workspaces, shared, tooling) | **done** |
| 02 | Shared Zod contract (`packages/shared`) | **done** |
| 03 | Backend `/convert` route (Fastify + Calibre) | **done** ⚠️ live conv. untested |
| 04 | Frontend shell (Vite, Router, Query, Tailwind, Base UI) | **done** |
| 05 | Smart uploader + convert flow (Download / Go back) | **done** |
| 06 | PDF reader (react-pdf) + shared chrome | **done** |
| 07 | EPUB reader (react-reader) + toolbar + search | todo |

## Verified
Nothing to verify yet — no code.
