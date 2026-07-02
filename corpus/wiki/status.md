# Status — 2026-07-02

**Phase:** implementation, wave 1 done. Monorepo scaffold landed.

## Where things stand
Spec locked in the wiki. Build running autonomously wave-by-wave via the
orchestrator. Brief 01 (scaffold) done + verified (typecheck passes, workspaces
wired). Next: wave 2 = brief 02 (shared Zod contract), then waves 3–5.

## Briefs
| # | Brief | State |
|---|---|---|
| 01 | Monorepo scaffold (npm workspaces, shared, tooling) | **done** |
| 02 | Shared Zod contract (`packages/shared`) | todo |
| 03 | Backend `/convert` route (Fastify + Calibre) | todo |
| 04 | Frontend shell (Vite, Router, Query, Tailwind, Base UI) | todo |
| 05 | Smart uploader + convert flow (Download / Go back) | todo |
| 06 | PDF reader (react-pdf) + shared chrome | todo |
| 07 | EPUB reader (react-reader) + format-adaptive toolbar + search | todo |

## Verified
Nothing to verify yet — no code.
