# Open Questions

Only genuinely unresolved threads. Delete each the moment it's answered.

- **Backend live conversion unverified.** Calibre is not installed on the dev
  box, so the real EPUB→PDF path (brief 03) was never smoke-tested end-to-end —
  only the CALIBRE_MISSING path. Install Calibre + convert a real EPUB before
  calling the backend fully done.
- **PDF outline / TOC.** react-pdf exposes a document outline unevenly; decide in
  brief 06 whether PDF gets a TOC drawer or only EPUB does.
- **In-book search UX for PDF.** Searching the PDF.js text layer across lazy-
  rendered pages needs a strategy (index on load vs. search-on-demand). Resolve
  in brief 07.

_(Everything else is locked in [decisions.md](decisions.md).)_
