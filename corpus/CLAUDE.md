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

Personal, single-user, **stateless** ebook reader. Upload → read → gone on
refresh. No accounts, no persistence, no library. Reads PDF (react-pdf) and EPUB
(react-reader/epub.js) 100% client-side; a single Fastify route converts
EPUB→PDF via Calibre for download. See `wiki/overview.md`.
