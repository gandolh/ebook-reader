---
summary: The genuinely unresolved threads only — each deleted the moment it's answered (history lives in status.md + log.md).
updated: 2026-07-07
---

# Open Questions

Only genuinely unresolved threads. Delete each the moment it's answered.

- **Library DB stores absolute file paths → dead rows after a checkout move.**
  Found 2026-07-07 (brief 08 verification): rows created under the old
  `/home/gandolh/projects/ebook-reader` checkout 500 on `GET /library/:id/file`
  and `/cover` because the DB persists absolute paths that no longer exist
  (`ENOENT` on `D:\home\gandolh\...`). The blobs themselves live fine under
  `apps/api/library/<id>.<ext>` — storing paths *relative to the storage root*
  (or deriving them from `id` + `format`) would make the library portable.
  Also: dead rows linger in the UI with no cleanup path.

Both former verification gaps closed on 2026-07-02 by the
full Playwright run + live Calibre conversion (see
[../test-plans/RESULTS.md](../test-plans/RESULTS.md)):

- ~~Backend live conversion unverified~~ — real EPUB→PDF round-trip verified
  (200, valid 28MB PDF, ~6s). Note: the API must spawn Calibre with
  `PYTHONNOUSERSITE=1` on hosts where a pip lxml shadows the distro one (it
  does now).
- ~~Readers not pixel-verified~~ — both readers rendered, exercised, and
  screenshot-audited against real files; several real defects found and fixed
  (EPUB blank-render on real-world books being the headline).
