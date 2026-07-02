# Status — 2026-07-02

**Phase:** implementation, waves 1–2 done. Scaffold + shared contract landed;
wave 3 (backend + frontend shell) in flight.

## Where things stand
Spec locked in the wiki. Build running autonomously wave-by-wave. Briefs 01–02
done + verified. Wave 3 = briefs 03 (backend `/convert`) ∥ 04 (frontend shell),
dispatched in parallel. Then wave 4 (05 uploader ∥ 06 PDF reader), wave 5 (07 EPUB).

## Briefs
| # | Brief | State |
|---|---|---|
| 01 | Monorepo scaffold (npm workspaces, shared, tooling) | **done** |
| 02 | Shared Zod contract (`packages/shared`) | **done** |
| 03 | Backend `/convert` route (Fastify + Calibre) | in progress |
| 04 | Frontend shell (Vite, Router, Query, Tailwind, Base UI) | in progress |
| 05 | Smart uploader + convert flow (Download / Go back) | todo |
| 06 | PDF reader (react-pdf) + shared chrome | todo |
| 07 | EPUB reader (react-reader) + format-adaptive toolbar + search | todo |

## Verified
Nothing to verify yet — no code.
