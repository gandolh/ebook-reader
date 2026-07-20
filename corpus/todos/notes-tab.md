---
title: Notes tab — draw + write on paged notes (Samsung Notes-like)
created: 2026-07-20
status: promoted
tags: [notes, frontend, backend, canvas, ink, feature]
---

> Promoted 2026-07-20 → [brief 26](../briefs/done/26-notes-tab.md), shipped +
> live-audited. v1 follow-ups still open (from Acceptance): handwriting→text,
> folders, page templates, export, offline editing, richer tool set.

# Notes tab — draw + write on paged notes (Samsung Notes-like)

Add a **Notes** area to Atrium: open a note, **draw** freehand and **write**,
on a **paged notebook**, with a Samsung Notes-like feel. Must be **mobile
responsive** (finger + stylus). This is a new user-created-content subsystem —
a peer top-level tab alongside Books / Music / Videos in the rebranded IA (see
[rebrand-to-media-gallery.md](rebrand-to-media-gallery.md)), not "media you
collect."

## Grilled decisions (2026-07-20, owner-confirmed)

1. **Content model — ink + text boxes on a page.** Freehand ink is primary
   (pen/highlighter/eraser); you can also drop and drag **movable typed-text
   boxes** onto the same page. *Not* a full flowing rich-text document with
   inline reflowing ink — text is placed objects, ink is strokes.
2. **Draw engine — vector ink from scratch.** Native **Pointer Events** +
   **[perfect-freehand](https://github.com/steveruizok/perfect-freehand)** for
   smooth, pressure-sensitive variable-width strokes. Self-hosted, tiny, no
   heavy whiteboard SDK — matches Atrium's quiet look and the codebase's
   self-hosted / pinned-deps ethos (D14, D21). *Not* tldraw/Excalidraw (heavy
   bundle + an opinionated aesthetic that fights the design system).
3. **Storage — per-user server-side.** Notes persist per-user in `apps/api`
   (SQLite), synced across devices — reuses the existing accounts guard +
   per-user model (D30/D31). Vector strokes are compact enough to store as
   JSON. (Offline editing is a later hybrid; the PWA/IndexedDB infra from
   briefs 19–20 exists to build on.)
4. **Structure — paged notebook.** A note is an ordered set of discrete
   **pages** you flip/scroll through (Samsung Notes / real-notebook model),
   *not* an infinite pan/zoom canvas — more approachable on phones.

## Inline research (2026-07-20)

**Samsung Notes (the feel to match):** a paged notebook that mixes **typed
text and handwriting on the same page**; a tool set of pen / fountain pen /
pencil / **highlighter** / **eraser** with color + thickness; eraser works
either **per-stroke** or **by area**; extras include handwriting→text
conversion, folders/subfolders, and export to PDF/Word/image. Sources:
[Samsung Notes handwriting functions](https://www.samsung.com/us/support/answer/ANS10003634/),
[Samsung Notes features & settings](https://www.samsung.com/us/support/answer/ANS10001384/).
For v1 we take the **core**: pen + highlighter + eraser, color + thickness,
typed text boxes, paged. Handwriting→text, folders, and export are follow-ups
(see open questions).

**Web ink tech:** **perfect-freehand** (the library extracted from Excalidraw's
free-draw) turns a stream of input points + pressure into a variable-width
stroke outline — the standard primitive for smooth, stylus-grade ink; compact
vector data, renders crisp at any zoom. **Pointer Events** unify mouse / touch /
pen and expose `pressure` and `tiltX/Y`; `getCoalescedEvents()` recovers the
high-frequency samples between frames for smooth fast strokes. (A fuller small
canvas lib, [atrament](https://github.com/jakubfiala/atrament) — pleasant name
coincidence — is an alternative, but perfect-freehand as the geometry primitive
+ our own tool UI keeps control and bundle down.) tldraw is a 45k-star infinite-
canvas SDK but heavy and Figma/hand-drawn-styled; ruled out per decision 2.
Sources:
[perfect-freehand origin (Excalidraw #3500)](https://github.com/excalidraw/excalidraw/issues/3500),
[tldraw vs Excalidraw aesthetics](https://sliplane.io/blog/5-awesome-excalidraw-alternatives).

**Mobile/stylus must-dos (from the research):** `touch-action: none` on the
canvas so drawing doesn't scroll the page; **palm rejection** (when
`pointerType === 'pen'` is active, ignore `touch` pointers); pressure from
`event.pressure` (falls back to a movement-simulated value on hardware without
it); a responsive tool bar (bottom sheet on mobile, side rail on desktop).

## Implementation sketch (for the future brief, not locked)

**Contract (`packages/shared`, D11):** Zod schemas for the note model —
`Note { id, title, pages: Page[], updatedAt }`,
`Page { background: 'blank'|'ruled'|'grid', strokes: Stroke[], texts: TextBox[] }`,
`Stroke { tool, color, size, points: [x,y,pressure][] }`,
`TextBox { x, y, w, text, size }`. Shared by web + api so they can't drift.

**Backend (`apps/api`):** a `notes` table (+ maybe `note_pages`), per-user
(the global `onRequest` auth guard already covers new routes — no bespoke
auth). CRUD routes: `GET/POST/PATCH/DELETE /notes` (+ list returns
lightweight metadata + a thumbnail ref). Debounced autosave PATCH, same spirit
as the reading-progress flush. Optionally store a small rendered **thumbnail**
(first page → PNG) for the list card, rendered client-side on save and uploaded
(reuse the cover-storage-on-disk pattern, D25), or skip thumbnails for v1 and
render a placeholder.

**Frontend (`apps/web`):**
- New **`/notes`** route + a peer nav tab in the rebrand's `AppHeader` shell
  (depends on the rebrand IA brief's nav — see sequencing).
- **Notes list** — quiet cards (note title + thumbnail/first-page preview +
  updated date), "New note", delete. Its own grid (not a media card shape).
- **Editor** — a `<canvas>` (or SVG) page surface sized to the notebook page;
  Pointer-Events capture → perfect-freehand → render strokes; a tool bar
  (pen / highlighter / eraser, color swatches, thickness), **undo/redo**,
  text-box tool (tap to place, drag to move, type to edit), page
  navigation/add-page. Page background templates (blank / ruled / grid).
- **Themes:** the editor must honor the three reader themes (light/sepia/dark)
  and Atrium's evolved design tokens — the page surface uses the surface/paper
  tokens; the tool UI uses Inter `label-ui` quiet controls. Conform to the
  evolved design system's checklist.
- **Mobile:** `touch-action: none`, palm rejection, pressure, coalesced
  events, responsive tool bar (bottom sheet ↔ side rail).

**Decisions to lock at brief time:** per-user server storage; vector ink;
`perfect-freehand` as a new **pinned** dep (D21); paged model; ink+text-box
content model. (Candidate new D-numbers when built.)

## Sequencing vs the rebrand
Notes needs the **nav shell** the rebrand's IA brief introduces (peer tab
alongside Books/Music/Videos). Cleanest order: land the rebrand's IA/nav brief
first (or at least the shell), then build Notes against it. The Notes *engine*
(canvas + strokes + storage) is independent and can be prototyped in parallel;
only the nav integration depends on the rebrand.

## Acceptance

Not specified yet — capture-stage. Core v1 is settled by the grill above
(ink + text boxes, perfect-freehand, per-user server storage, paged, mobile +
stylus). **Open questions for the promote-time grill:**
- **Tool set for v1:** pen + highlighter + eraser only, or also pencil/
  fountain-pen textures? Fixed color palette (how many?) + how many thickness
  steps?
- **Eraser:** per-stroke erase (natural for vector) only, or also area erase?
- **Page templates:** blank only for v1, or blank/ruled/grid from the start?
- **Page size/behavior:** fixed page aspect (A4-ish) vs fit-to-screen; scroll
  vs flip between pages; any zoom within a page?
- **Thumbnails:** render first-page PNG on save (nicer list) vs placeholder v1.
- **Export** (PDF/image, Samsung-style): v1 or follow-up? (Client-side
  canvas→PDF; unrelated to the existing Calibre convert path.)
- **Organization:** flat notes list for v1 vs folders (Samsung has folders).
- **Handwriting→text conversion:** confirm **out** for v1 (needs an ML/OCR
  service — doesn't fit the self-hosted, no-heavy-deps ethos).
- **Offline notes:** online-only v1, with a later hybrid using the briefs 19–20
  IndexedDB infra?
- **Undo/redo depth** and autosave cadence.
