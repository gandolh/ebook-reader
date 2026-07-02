# Open Questions

Only genuinely unresolved threads. Delete each the moment it's answered.

Two verification gaps remain — both are dev-machine tooling limits, not code
defects. Neither has been observed to fail; both need a real environment to close.

- **Backend live conversion unverified.** Calibre is not installed on the dev
  box, so the real EPUB→PDF path (brief 03) was never smoke-tested end-to-end —
  only the CALIBRE_MISSING path. Install Calibre + convert a real EPUB before
  calling the backend fully done.
- **Readers not pixel-verified.** No headless browser (Playwright/Puppeteer) is
  installed, so the PDF/EPUB readers are build- and contract-verified but never
  rendered live. Open `/read?format=pdf&dev=1` and `/read?format=epub&dev=1`
  (double-gated dev samples) in a browser to confirm rendering, nav, themes, TOC,
  and search visually.

_(Search strategy resolved: PDF uses **search-on-demand** over the PDF.js text
layer — see [reader.md](reader.md). Everything else is locked in
[decisions.md](decisions.md).)_
