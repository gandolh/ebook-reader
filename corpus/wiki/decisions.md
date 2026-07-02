# Decisions (locked)

Settled choices from the grill session. Don't relitigate without an explicit
revisit + a `log.md` note.

| # | Decision | Rationale |
|---|---|---|
| D1 | **EPUB→PDF is export-only**, never a reading path | Conversion discards reflow; native EPUB reading is superior |
| D2 | **Single-user, no auth** | Personal tool; auth is yak-shaving, not the interesting part |
| D3 | **No persistence** — upload → read → gone on refresh | User handles their own files; keeps backend stateless |
| D4 | **Backend = one stateless `/convert` route** | Both formats render client-side; conversion is the only server job |
| D5 | **Calibre `ebook-convert`** for conversion | Best fidelity; acceptable to require the binary for a personal app |
| D6 | **EPUB render = react-reader / epub.js** | De facto standard, React wrapper, fast to Kindle-like reflow |
| D7 | **PDF render = react-pdf (PDF.js)** | Clean React API, keeps custom chrome control |
| D8 | **TanStack Router + Query** | Router for views; Query `useMutation` for the one convert call |
| D9 | **Zustand** for in-memory reader state | Resets on refresh — intended |
| D10 | **Monorepo = npm workspaces** | No pnpm/Turborepo; `apps/web`, `apps/api`, `packages/shared` |
| D11 | **`packages/shared` holds Zod contract** | Single source of truth; client + server can't drift |
| D12 | **Formats = PDF + EPUB only** for v1 | Matches the two reading paths; MOBI/AZW3 deferred |
| D13 | **Detection = extension/MIME only** (no magic bytes) | Spoofing isn't a threat for a personal tool |
| D14 | **CORS + `VITE_API_URL`** (no Vite proxy) | Explicit base URL, deploy-ready |
| D15 | **Convert limits: 50MB / 60s / structured errors / no queue** | Sane defaults for single-user |
| D16 | **Tailwind + Base UI** | Fast chrome; unstyled accessible primitives keep the Kindle look |
| D17 | **Local dev only** — `npm run dev`, no Docker/deploy | Personal tool |
| D18 | **No bookmarks/highlights in v1** | Pointless without persistence |
| D19 | **In-book search IS in v1** | Kept during scoping |
| D20 | **Tailwind v4** (with `@base-ui/react`) | Matches Base UI's documented examples; greenfield 2026 build |

## After-conversion UX (D1 detail)
Two buttons only: **Download** (save the PDF) and **Go back** (return to
uploader). No "read in new tab" — to read a converted PDF, the user re-uploads
it (which routes through the normal PDF reading path).
