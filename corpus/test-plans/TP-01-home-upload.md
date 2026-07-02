# TP-01 — Home / smart uploader

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).

## Goal
The uploader classifies files correctly and routes PDFs to the reader, forks
EPUBs to Read/Convert, and rejects unsupported types.

## Cases
1. **Initial render** — `/` shows title, hint copy, and the dropzone with
   supported formats listed. No console errors.
2. **Browse → PDF** — click dropzone, pick `2603.16021v2.pdf` → navigates to
   `/read?format=pdf` and the PDF renders.
3. **Browse → EPUB fork** — pick the Apothecary EPUB → fork panel appears with
   filename and Read / Convert to PDF / Cancel buttons.
4. **Fork → Cancel** — returns to the idle dropzone.
5. **Fork → Read** — navigates to `/read?format=epub` and the EPUB renders.
6. **Unsupported type** — pick a `.txt` file → inline error names supported
   formats; dropzone still usable afterwards.
7. **Direct /read visit** — open `/read` fresh → "No file loaded" state with a
   working "Go to home" link.
8. **Keyboard** — dropzone is focusable; Enter/Space opens the file chooser.

## Pass criteria
All routing behaves as above with no red console errors; error state recovers.
