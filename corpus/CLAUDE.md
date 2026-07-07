# Corpus — ebook-reader

This `corpus/` is the project's LLM-maintained wiki + work tracker. **Read
`index.md` first.** The human curates sources and asks questions; the LLM curates
the synthesis (`wiki/`) and tracks work (`briefs/`, `log.md`).

## Layout

```
corpus/
  CLAUDE.md      this file — schema + conventions
  index.md       content catalog / front door
  log.md         chronological record of meaningful changes
  routing.md     orchestrate routing profile
  todos/         captured ideas (prose, pre-spec)
  briefs/        immutable work specs — todo/ done/ superseded/
  wiki/          curated synthesis pages (LLM owns these)
```

## Conventions (load-bearing)

- **Brief numbers are stable** — never renumber when a brief moves dirs.
- **Standard relative markdown links**, not `[[wikilinks]]`. Code refs from
  `wiki/` are `../../apps/...`; from `briefs/<state>/` they're `../../../apps/...`.
- **Absolute dates** (`2026-07-02`), never "yesterday".
- **One concept per file**; split a wiki page past ~200 lines.
- **Source-of-truth ordering** when things disagree:
  1. actual code > any wiki claim
  2. a `done/` brief > `wiki/` if the wiki lags
  3. `decisions.md` > `status.md` for locked tech choices
  Verify any path/function a page names before acting on it — pages drift.
- **LLM owns `wiki/`; briefs are immutable; index/log are navigation.**
- **Never commit** corpus changes unless the user explicitly asks.

## Project one-liner

Personal, single-user ebook reader with a **persistent library**. Upload a PDF
or EPUB → it's saved (server-side SQLite) and shows as a cover card → reopen and
read anytime. No accounts (D2). Reads PDF (react-pdf) and EPUB
(react-reader/epub.js) 100% client-side; the Fastify backend owns the library
(CRUD + file/cover storage) and still converts EPUB→PDF via Calibre. Reading
*position* is still session-only (D9). See `wiki/overview.md`.

## Design enforcement (load-bearing)

**`wiki/design.md` ("Quiet Paper") is the enforced design system (D27).** Every
`apps/web` change MUST conform. Before treating any frontend work as done, run
its **conformance checklist** (bottom of `design.md`): theme tokens only (no raw
hex in components), the Playfair / Source Serif 4 / Inter type roles, the radii
+ elevation + spacing rules, sparing accent use, and a visual check against
`design/stitch_extracted/screen.png` for the library home.
