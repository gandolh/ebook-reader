---
summary: The enforced "Quiet Paper" visual language (D27) — theme tokens, Playfair/Source Serif 4/Inter type roles, spacing/elevation rules, and the frontend conformance checklist.
updated: 2026-07-07
---

# Design — "Quiet Paper"

The single source of truth for the app's **visual language**. Every frontend
change (`apps/web`) must conform to this page. Derived from the Stitch
exploration `design/stitch_extracted/DESIGN.md` (screen: `design/stitch_extracted/screen.png`)
and **merged** with the reader theme tokens that already ship in
[`apps/web/src/styles/globals.css`](../../apps/web/src/styles/globals.css).

> Source-of-truth note: the reader's three *reading themes* (light / sepia /
> dark, the `--reader-*` variables) are load-bearing and predate this page.
> Quiet Paper does **not** replace them — it is the **library/chrome** design
> system that sits around them, and the light reading theme is tuned to match
> Quiet Paper's paper surface. See "How this merges" below.

## Brand & style
Studious, serene, tactile — the immersive feel of physical reading, for a
mature audience doing deep work with literature. The style blends
**Minimalism** with **Tactile Modernism**: a high signal-to-noise ratio,
generous whitespace, precise typography, and a "paper-first" material logic.
Elements feel *printed on* or *lightly resting upon* a physical surface — never
glowing, never aggressively digital.

## Colors

Grounded in "Ink and Paper". Warm off-white surfaces reduce eye strain; a faded
ink-blue is the only accent. **Primary is used sparingly** — active states,
progress, subtle highlights — like a faded ink stamp, not a glowing button.

### Quiet Paper palette (library + chrome)
| Token | Hex | Use |
|---|---|---|
| `background` / `surface` | `#fcf9f8` | The paper base (page background) |
| `surface-container-lowest` | `#ffffff` | Raised cards / sheets |
| `surface-container-low` | `#f6f3f2` | Subtle fills, hover |
| `surface-container` | `#f0eded` | Cover-tile fallback ground |
| `surface-container-high` | `#eae7e7` | Pressed / active fills |
| `on-surface` (Ink) | `#1c1b1b` | Primary text (never pure black) |
| `on-surface-variant` | `#43474f` | Secondary text, captions |
| `outline` | `#737780` | Strong borders, icon strokes |
| `outline-variant` | `#c3c6d1` | Hairlines, dashed dropzone border |
| `primary` | `#30568b` | Accent — active, links, progress |
| `primary-container` | `#4a6fa5` | Faded-ink accent fill |
| `on-primary` | `#ffffff` | Text on primary |
| `inverse-surface` | `#313030` | Solid **Ink button** fill |
| `inverse-on-surface` | `#f3f0ef` | Text on the Ink button |
| `error` | `#ba1a1a` | Error text/border |
| `error-container` | `#ffdad6` | Error background |

### Reading themes (the reader surface — unchanged, still authoritative)
These drive the `data-theme` attribute → `--reader-*` variables and are what the
PDF/EPUB *reading pane* uses. Quiet Paper's `light` values are aligned to them.

| Variant | bg | fg | surface | border | accent |
|---|---|---|---|---|---|
| light | `#fcf9f8`¹ | `#1c1b1b` | `#f6f3f2` | `#e2e2e2` | `#30568b`¹ |
| sepia | `#f4ecd8` | `#3b2f1e` | `#ece0c8` | `#d9c9a3` | `#92400e` |
| dark | `#181818` | `#e8e8e8` | `#242424` | `#3a3a3a` | `#60a5fa` |

¹ **Merge change:** light bg moves `#ffffff`→`#fcf9f8` and accent
`#2563eb`→`#30568b` so the reader's light theme matches the Quiet Paper paper +
faded-ink accent. Sepia/dark unchanged.

## Typography
Typography is the core of the system. High-contrast serif for display; a robust
serif for reading; a functional sans for UI ("interface" vs "content").

| Role | Family | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| `display-title` | **Playfair Display** | 48 / 56, `-0.02em` | 700 | Hero headline |
| `headline-lg` | **Playfair Display** | 32 / 40 | 600 | Section headers ("Recent Reads"), book titles |
| `headline-lg-mobile` | Playfair Display | 28 / 34 | 600 | Section headers on mobile |
| `body-reading` | **Source Serif 4** | 18 / 32 | 400 | The reading pane workhorse (≥1.7 line-height) |
| `label-ui` | **Inter** | 14 / 20, `0.01em` | 500 | Nav, buttons, settings |
| `label-caps` | **Inter** | 12 / 16, `0.08em` | 600 | Format badges, chips (uppercase) |

Rules: keep tracking tight on large Playfair sizes; use Inter for anything that
signals *interface*; keep reading body at a generous line-height to prevent
line-skipping.

**Fonts are self-hosted** (D14: explicit, deploy-ready, no external runtime
deps) — no Google Fonts CDN. Load Playfair Display (600, 700), Source Serif 4
(400), Inter (500, 600).

## Layout & spacing
**Fixed-fluid hybrid**: interface uses a standard grid; the **reading pane is
capped at `680px`** for optimal characters-per-line.

- **Margins:** mobile `20px`, desktop `64px` — expansive, to give book covers a
  "gallery" feel.
- **Gutter:** `24px`.
- **Rhythm:** `8px` base grid for layout, `4px` for micro type alignment.
- **Whitespace:** if in doubt, add one scale unit (`8px`). Never crowd.

## Elevation & depth
**No high shadows.** Depth = **tonal layering** + subtle scrims.
- **L0 base:** paper background.
- **L1 card/sheet:** 1px border (`outline-variant`) + a very soft shadow
  (offset `0 2px`, blur `8px`, opacity `0.04`).
- **Book covers:** a subtle *bottom-heavy* shadow so the book appears to stand
  on a shelf.
- **Modals:** semi-transparent backdrop **blur (12px)** to keep the reader
  grounded in context (matches the existing chrome `backdrop-blur`).

## Shapes
**Soft, not pill.** Slightly rounded like a book cover / stack of paper. Pills
read too "app-like" for a literary context.
- Standard elements: `4px` radius.
- **Book covers: `2px`** — structural, bound look.
- Selection highlights: `2px` or straight edges.

(Existing chrome uses larger radii on the floating toolbar pill; that is the one
sanctioned exception — it is a transient overlay, not a paper surface.)

## Components
- **Buttons — primary:** solid **Ink** (`inverse-surface #313030`) fill, paper
  text (`inverse-on-surface`). This is the "Upload a book" button.
- **Buttons — secondary:** 1px muted outline, transparent fill.
- **Chips / badges:** secondary sepia/`surface-container` background, **no
  border**, `label-caps` type. Format badges (EPUB / PDF) sit top-right on
  covers over a subtle scrim.
- **Cards (book covers):** 2:3 portrait, `2px` radius, bottom-heavy shadow.
  Missing cover → tinted `surface-container` tile with the **title set in
  Playfair** (the "Dune" / "Design Systems" fallback in the mockup).
- **Reading-progress bar:** thin **2px** horizontal bar in `primary`, along the
  bottom edge of the cover (and, in the reader, the bottom of the viewport).
- **Dropzone:** dashed `outline-variant` border, generous padding, centered
  upload glyph + `display`/`headline` prompt + helper line + the Ink button.
- **Lists (TOC / library rows):** ≥16px vertical padding, hairline separators.
- **Inputs:** minimalist — single bottom border (1px) that thickens to 2px /
  turns `primary` on focus.

## Icons
Line icons, unified **1.75 stroke** (matches the reader chrome). The mockup uses
Material Symbols Outlined; keep whatever icon set the codebase already uses
(currently inline SVGs) rather than adding a font dependency — match the
*weight/stroke*, not the specific set.

## How this merges with what exists
1. **Tokens:** add the Quiet Paper palette + font families to the Tailwind theme
   in `globals.css` alongside the existing `--reader-*` block. The `--reader-*`
   reading themes stay; only light-theme `bg`/`accent` shift to the values above.
2. **Fonts:** self-host the three families; wire `body-reading` to the EPUB
   rendition + PDF where applicable, Playfair to headlines, Inter to chrome.
3. **The floating reader toolbar** keeps its current shape (transient overlay
   exception noted above); its colors resolve through `--reader-*` so it themes
   correctly in sepia/dark.
4. **The library home** is the primary consumer of Quiet Paper (see
   [reader.md](reader.md) "Library home").

## Conformance checklist (enforced — see ../CLAUDE.md)
Any `apps/web` change must, before it's considered done:
- [ ] Use theme tokens / Tailwind theme colors — **no raw hex** in components
      (the only hex lives in `globals.css` / the Tailwind theme).
- [ ] Use the type roles above (Playfair / Source Serif 4 / Inter) — no ad-hoc
      `font-*`/size choices for headings, body, or UI labels.
- [ ] Respect radii (`4px` default, `2px` covers), the elevation rules (tonal
      layering, soft shadows only), and the spacing scale.
- [ ] Keep primary/accent **sparing** — active/progress/links only.
- [ ] Verify against `design/stitch_extracted/screen.png` for the library home.
