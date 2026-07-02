# Status — 2026-07-02

**Phase:** ✅ **v1 build complete.** All 7 briefs done + committed. All deps pinned
(D21); Node ≥22 (D23). Typecheck clean ×3; web + api build.

## Where things stand
The full v1 shipped: stateless monorepo, shared Zod contract, backend `/convert`
(Calibre), frontend shell, smart uploader + convert flow, PDF reader + shared
Kindle-style chrome, EPUB reader (real reflow theming), and shared in-book search
for both formats. **Two verification gaps remain (dev-machine tooling, not code):**
(1) backend live EPUB→PDF conversion never smoke-tested — Calibre not installed;
(2) readers not pixel-verified — no headless browser installed. Both tracked in
open-questions.md; both closeable by running in a real environment
(`/read?format=pdf|epub&dev=1` for the readers).

## Briefs
| # | Brief | State |
|---|---|---|
| 01 | Monorepo scaffold (npm workspaces, shared, tooling) | **done** |
| 02 | Shared Zod contract (`packages/shared`) | **done** |
| 03 | Backend `/convert` route (Fastify + Calibre) | **done** ⚠️ live conv. untested |
| 04 | Frontend shell (Vite, Router, Query, Tailwind, Base UI) | **done** |
| 05 | Smart uploader + convert flow (Download / Go back) | **done** |
| 06 | PDF reader (react-pdf) + shared chrome | **done** |
| 07 | EPUB reader (react-reader) + toolbar + search | **done** |

## Verified
Nothing to verify yet — no code.
