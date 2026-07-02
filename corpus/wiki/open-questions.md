# Open Questions

Only genuinely unresolved threads. Delete each the moment it's answered.

_None right now._ Both former verification gaps closed on 2026-07-02 by the
full Playwright run + live Calibre conversion (see
[../test-plans/RESULTS.md](../test-plans/RESULTS.md)):

- ~~Backend live conversion unverified~~ — real EPUB→PDF round-trip verified
  (200, valid 28MB PDF, ~6s). Note: the API must spawn Calibre with
  `PYTHONNOUSERSITE=1` on hosts where a pip lxml shadows the distro one (it
  does now).
- ~~Readers not pixel-verified~~ — both readers rendered, exercised, and
  screenshot-audited against real files; several real defects found and fixed
  (EPUB blank-render on real-world books being the headline).
