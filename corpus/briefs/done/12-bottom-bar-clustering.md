# Task 12 — Reading bottom bar: flex justify-between clustering (align PDF to EPUB)

## Context
The bottom bar should be a flex row with `justify-between`: **home button on the
left, the actionable buttons in the middle, page number + progress on the
right** — the way the EPUB reader already lays it out. The shared shell
([ReaderToolbar.tsx](../../../apps/web/src/reader/chrome/ReaderToolbar.tsx#L46-L52))
already provides exactly these three `justify-between` slots (`leftControls` /
`formatControls` / `rightControls`), so the shell is fine. The mismatch is in
what each reader puts in which slot:

- **EPUB** ([EpubReader.tsx](../../../apps/web/src/reader/epub/EpubReader.tsx#L751-L799)):
  left = Home; middle = TOC + search + **Aa settings**; right = chapter label + page/%.
  → clean right cluster (page + progress only).
- **PDF** ([PdfReader.tsx](../../../apps/web/src/reader/pdf/PdfReader.tsx#L306-L347)):
  left = Home; middle = TOC + search + zoom + invert; right = page/% **+ the
  settings gear**. → settings is jammed into the right cluster next to the page
  number, so PDF's right side doesn't match EPUB's.

Requested by the user (2026-07-13): make the bottom bar consistent, EPUB-style.

## Files you OWN
- [apps/web/src/reader/pdf/PdfReader.tsx](../../../apps/web/src/reader/pdf/PdfReader.tsx) — move the `SettingsPopover` (theme picker) out of `rightControls` and into the middle actions cluster (either into `PdfControls` or appended to the `formatControls` slot), leaving `rightControls` = `PageJumpInput` only, mirroring EPUB.
- Optionally [apps/web/src/reader/pdf/PdfControls.tsx](../../../apps/web/src/reader/pdf/PdfControls.tsx) if the settings trigger moves inside it (mirror how EPUB passes `settingsTrigger` into `EpubControls`).

## Files you must NOT touch
- [ReaderToolbar.tsx](../../../apps/web/src/reader/chrome/ReaderToolbar.tsx) — the shell already does the right thing; keep it format-agnostic.
- EPUB's toolbar wiring — it is the reference; don't change it.

## What to do
1. In `PdfReader`, relocate the `SettingsPopover` (gear + `ThemePicker`) from the `rightControls` slot into the middle actions (the `formatControls` region), so it sits with zoom/invert.
2. Reduce `rightControls` to just the `PageJumpInput` (page + progress), matching EPUB.
3. Confirm the three clusters read left / middle / right with `justify-between` and truncation still works on a narrow viewport.

## Acceptance
- PDF and EPUB bottom bars have the same structure: Home (left), actions incl. settings (middle), page + progress (right).
- No settings control remains in the right cluster of either reader.
- `npm run typecheck` clean; visual check on a PDF and an EPUB at desktop + narrow widths.

## Outcome (2026-07-13) — done

Shipped. Moved the PDF `SettingsPopover` (theme gear) out of the `rightControls` slot into the middle actions via a new optional `settingsTrigger` prop on `PdfControls` (mirroring EPUB's `EpubControls`). PDF `rightControls` is now just `PageJumpInput` — the bottom bar clusters identically to EPUB (Home / actions+settings / page+progress). Shell `ReaderToolbar` untouched. Typecheck clean.
