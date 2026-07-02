# Product

## Register

product

## Users

One user: the owner (a software engineer), reading on his own machine — evenings,
long sessions, often WSL/desktop browser at laptop and external-monitor sizes.
Two jobs: (1) sit down and read a book (EPUB, reflowable — the primary path;
PDF for papers), (2) occasionally convert an EPUB to PDF for use elsewhere.
No accounts, no library, no sync — a file goes in, reading happens, refresh
forgets (stateless by design, D3).

## Product Purpose

A personal, stateless ebook reader that makes the *reading* feel first-class:
upload → read → gone. Success = opening a real-world book and disappearing into
it for an hour without the UI ever demanding attention. The converter is a
utility side-door, never the star.

## Brand Personality

**Quiet paper.** Calm, warm, invisible-until-needed. The typography and the
page are the interface; chrome exists only in the moments it's summoned
(Kindle / iA Writer lineage). Three words: quiet, warm, precise.

## Anti-references

- **Adobe/Foxit-style PDF viewers** — dense gray toolbars, icon soup,
  enterprise chrome framing the page from all four sides.
- Web-app grammar leaking into the reading surface (cards, chips, dashboard
  scaffolding) — the reader is a page, not an app screen.

## Design Principles

1. **The page is the interface.** Every pixel of chrome must justify itself
   against a blank margin. Prefer summoned UI (auto-hide, popovers) over
   persistent UI.
2. **Typography does the design.** Hierarchy, warmth, and craft come from type
   and spacing, not decoration.
3. **Reading state is sacred.** Never steal focus, shift the text, or animate
   the page while someone is mid-paragraph. Motion conveys state only.
4. **Familiar hands.** Page-turn, TOC, search, themes behave the way a
   fluent Kindle/Books user's hands already expect — earned familiarity, no
   invented affordances.
5. **The utility stays a utility.** Upload/convert screens are efficient and
   plain; polish budget goes to the reader.

## Accessibility & Inclusion

WCAG AA: ≥4.5:1 body text in all three themes, full keyboard operability
(page-turn, drawers, settings), visible focus, `prefers-reduced-motion`
respected (crossfades instead of movement). Single-user product, but the bar
holds everywhere.
