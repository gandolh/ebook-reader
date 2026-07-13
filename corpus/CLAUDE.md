# Corpus — ebook-reader

This `corpus/` is the project's LLM-maintained wiki + work tracker. **Read
`index.md` first.** The human curates sources and asks questions; the LLM curates
the synthesis (`wiki/`) and tracks work (`briefs/`, `log.md`).

## Layout

```
corpus/
  CLAUDE.md      this file — schema + conventions
  index.md       content catalog / front door (wiki catalog is generated — see below)
  log.md         chronological record of meaningful changes
  routing.md     orchestrate routing profile
  lint.sh        health check: frontmatter, link resolution, page size (+ --index)
  todos/         captured ideas (prose, pre-spec)
  briefs/        immutable work specs — todo/ done/ superseded/
  wiki/          curated synthesis pages (LLM owns these) — each opens with frontmatter
  test-plans/    plain-text browser test plans + latest RESULTS (see ui-test-plans)
```

## Conventions (load-bearing)

- **Brief numbers are stable** — never renumber when a brief moves dirs.
- **Every wiki page carries `summary:` + `updated:` frontmatter.** `summary:` is
  the retrieval signal — written for an agent deciding whether to open the page,
  not as a title. `index.md`'s wiki catalog is **generated** from those summaries
  (`bash corpus/lint.sh --index`); never hand-edit between its markers.
- **Retrieval budget (a rule, not advice):** read `index.md`, triage on the
  summaries, then open **at most 2–3 wiki pages**. Needing more is a signal a
  page is straddling topics and must split. Never read `briefs/`/`todos/`
  wholesale — `status.md` holds each brief's state in one line.
- **`bash corpus/lint.sh` before committing corpus changes** — it checks
  frontmatter, that every relative link resolves, and page size (~200 body
  lines). Exit non-zero gates the commit; the human sweep (stale claims,
  contradictions) still matters.
- **Standard relative markdown links**, not `[[wikilinks]]`. Code refs from
  `wiki/` are `../../apps/...`; from `briefs/<state>/` they're `../../../apps/...`.
- **Absolute dates** (`2026-07-02`), never "yesterday".
- **One concept per file**; split a wiki page past ~200 body lines.
- **Source-of-truth ordering** when things disagree:
  1. actual code > any wiki claim
  2. a `done/` brief > `wiki/` if the wiki lags
  3. `decisions.md` > `status.md` for locked tech choices
  Verify any path/function a page names before acting on it — pages drift.
- **LLM owns `wiki/`; briefs are immutable; index/log are navigation.**
- **Never commit** corpus changes unless the user explicitly asks.

## Project one-liner

Personal ebook reader with a **persistent library**. Upload a PDF or EPUB → it's
saved (server-side SQLite) and shows as a cover card → reopen and read anytime.
Reads PDF (react-pdf) and EPUB (react-reader/epub.js) 100% client-side; the
Fastify backend owns the library (CRUD + file/cover storage) and still converts
EPUB→PDF via Calibre. The code now has **per-user accounts** (operator-seeded,
no self-registration) with **per-user reading progress + exact resume position**
(`users`/`sessions`/`reading_progress` tables in `apps/api/src/db.ts`). See
`wiki/overview.md`.

> **⚠️ Corpus content drift (2026-07-13).** The per-user-accounts and
> per-user-reading-progress work (commits `7caaa42`, `207cf7b`) landed in the
> **code** but the wiki hasn't caught up: `decisions.md` still describes the
> shared-password model (D28/D29) and older no-accounts/session-only stances
> (D2/D9), and there's no `log.md` entry for it. Per source-of-truth ordering the
> **code wins**, but these locked decisions need an explicit revisit (new D-entry
> + `log.md` note) — not a quiet rewrite. Reconcile before trusting decisions.md
> on auth/progress.

## Design enforcement (load-bearing)

**`wiki/design.md` ("Quiet Paper") is the enforced design system (D27).** Every
`apps/web` change MUST conform. Before treating any frontend work as done, run
its **conformance checklist** (bottom of `design.md`): theme tokens only (no raw
hex in components), the Playfair / Source Serif 4 / Inter type roles, the radii
+ elevation + spacing rules, sparing accent use, and a visual check against
`design/stitch_extracted/screen.png` for the library home.
