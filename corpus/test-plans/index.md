# Test plans — ebook-reader

Plain-text plans a human or a fresh agent can execute in a real browser.
Environment/bring-up lives in the Playwright hub: [../../playwright/README.md](../../playwright/README.md).

## Catalog

| Plan | Area |
|---|---|
| [TP-01](TP-01-home-upload.md) | Home / smart uploader (drop, browse, validation, EPUB fork) |
| [TP-02](TP-02-pdf-reader.md) | PDF reader (render, nav, zoom, TOC, search, themes, chrome) |
| [TP-03](TP-03-epub-reader.md) | EPUB reader (render, nav, TOC, search, themes, font settings) |
| [TP-04](TP-04-convert-flow.md) | EPUB→PDF conversion (live Calibre round-trip) |
| [TP-05](TP-05-ui-ux-audit.md) | UI/UX audit (responsive, states, focus/a11y, contrast) |

## How a run works

1. Bring up `npm run dev`, verify `GET /health` on :3001 and the web on :5173.
2. Walk each plan's cases in order, actually performing interactions.
3. Screenshot key states to `playwright/screenshots/<plan-id>-<step>.png`.
4. Record outcomes in [RESULTS.md](RESULTS.md); file durable findings as corpus
   todos/briefs; add a line to [../log.md](../log.md).
