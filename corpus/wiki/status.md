# Status — 2026-07-02

**Phase:** implementation, waves 1–3 done. Backend + frontend shell landed.
All deps pinned (D21); Node ≥22 (D23). Next: wave 4.

## Where things stand
Spec locked in the wiki. Build running autonomously wave-by-wave. Briefs 01–04
done + verified (typecheck clean ×3, Vite build ok). **Caveat:** backend live
EPUB→PDF conversion unverified — Calibre not installed on dev box (see
open-questions.md). Next: wave 4 = briefs 05 (uploader/convert) ∥ 06 (PDF reader +
shared chrome), then wave 5 (07 EPUB reader + search).

## Briefs
| # | Brief | State |
|---|---|---|
| 01 | Monorepo scaffold (npm workspaces, shared, tooling) | **done** |
| 02 | Shared Zod contract (`packages/shared`) | **done** |
| 03 | Backend `/convert` route (Fastify + Calibre) | **done** ⚠️ live conv. untested |
| 04 | Frontend shell (Vite, Router, Query, Tailwind, Base UI) | **done** |
| 05 | Smart uploader + convert flow (Download / Go back) | todo |
| 06 | PDF reader (react-pdf) + shared chrome | todo |
| 07 | EPUB reader (react-reader) + format-adaptive toolbar + search | todo |

## Verified
Nothing to verify yet — no code.
