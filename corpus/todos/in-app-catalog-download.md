---
title: Download books in-app from free catalogs (Gutenberg etc.), Foliate-style
created: 2026-07-16
status: promoted
tags: [library, backend, integration]
---

# Download books in-app from free catalogs (Gutenberg etc.), Foliate-style

Add a way to search/browse a free ebook catalog inside the app and download a
book straight into the library — the way Foliate (the Linux reader) does with
its built-in catalogs. The source library must be **free, legal, and trusted
by the community**.

## Context

Inline research findings (2026-07-16):

**How Foliate does it (the model to copy):** Foliate ships built-in catalogs —
Project Gutenberg, Standard Ebooks, Feedbooks — and since 3.x speaks
**OPDS** (Open Publication Distribution System, the Atom/JSON catalog standard
for ebook discovery + download), letting users add any OPDS source. Sources:
[Foliate (Wikipedia)](https://en.wikipedia.org/wiki/Foliate_(software)),
[UbuntuHandbook on Foliate's OPDS support](https://ubuntuhandbook.org/index.php/2024/01/foliate-opds-catalogs/),
[OPDS guide](https://github.com/getbookshelves/opds-catalog).

**Candidate sources, evaluated:**

- **Project Gutenberg** — ~75k public-domain EPUBs; the canonical free/legal
  source, community-trusted since 1971. No official API; two sanctioned
  routes: the nightly XML/RDF catalog dumps, or **Gutendex**
  ([github.com/garethbjohnson/gutendex](https://github.com/garethbjohnson/gutendex)),
  the community JSON API (open source, self-hostable) that most reading apps
  use. PG's [robot-access policy](https://www.gutenberg.org/policy/robot_access.html)
  forbids crawling the website — normal per-book downloads are fine, bulk
  scraping is not. **Best fit for v1.**
- **Standard Ebooks** — hand-polished public-domain EPUB3s, superb quality
  and metadata (would group beautifully per Brief 21). Caveat: their full
  [OPDS/Atom feeds](https://standardebooks.org/feeds) are **Patrons
  Circle-gated** (donation); only the New Releases feed is open. Site
  downloads stay free. Good second source, needs the gating handled.
- **Feedbooks public domain** — Foliate's third built-in; OPDS.
- **Internet Archive / Open Library** — biggest catalog, but mostly
  controlled digital lending (borrowing), not clean downloads; legality is
  murkier. **Out.**

**Best practices from the research:**
- Fetch **metadata** via Gutendex (or self-host it); don't crawl gutenberg.org.
- Cache catalog/search responses — the catalog changes slowly; be gentle with
  the community-run Gutendex instance (no hard rate limit, best-effort).
- Download the **EPUB file** directly from the URL in Gutendex's `formats`
  map for the one chosen book (that's a normal user download, policy-fine).
- Longer-term, a generic **OPDS client** is the standards-track way to
  support many catalogs at once (what Foliate/Thorium do).

**Fit with our architecture:** gutenberg.org/Gutendex don't serve CORS for
browsers, and the library lives server-side anyway — so the flow is:
`apps/web` search UI → `apps/api` proxies the catalog search (with caching) →
user picks a book → API downloads the EPUB and pushes it through the
**existing upload pipeline** (extract → cover → SQLite row) → the book appears
as a normal library card. No new storage concepts; PDFs not involved
(catalogs serve EPUB).

Suggested v1 scope: Project Gutenberg via Gutendex (search by title/author →
top results with covers → one-click "Add to library"). Standard Ebooks and/or
generic OPDS as a follow-up.

## Acceptance

Not specified yet — capture-stage. Open questions for the grill: search-only
vs browse (popular/new lists); where the entry point lives in the library UI
(Quiet Paper: the utility must stay a utility); Gutendex public instance vs
self-hosted; whether duplicate detection (same book re-imported) matters.

> Promoted to [briefs/done/22-gutenberg-discover.md](../briefs/done/22-gutenberg-discover.md)
> (2026-07-16) after grilling: search + browse (popular/topics/language) on a
> dedicated `/discover` page (TanStack Router + Query), public Gutendex with a
> server-side TTL cache, duplicate badge + reimport allowed.
