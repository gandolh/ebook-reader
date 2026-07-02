# TP-05 — UI/UX audit

Run setup & fixtures: [../../playwright/README.md](../../playwright/README.md).

## Goal
Beyond "it works": the app looks intentional, behaves at all sizes, and is
keyboard/contrast accessible.

## Cases
1. **Responsive** — home + both readers at 375×667 (mobile), 768×1024 (tablet),
   1440×900 (desktop). No horizontal scroll, no overlapping chrome, tap targets
   usable.
2. **Empty/edge states** — "No file loaded" state; long filenames in the fork
   panel; error banner layout.
3. **Loading states** — PDF/EPUB load spinners; convert in-flight state.
4. **Modal/drawer behavior** — TOC drawer + settings popover: Escape closes,
   backdrop click closes, focus goes in and returns.
5. **Keyboard pass** — tab order on home and in the reader toolbar; visible
   focus rings; reader arrow keys don't fight browser scroll.
6. **Contrast** — text vs background in all three themes ≥ 4.5:1 for body text;
   toolbar icons legible in dark theme.
7. **Visual coherence** — spacing rhythm, alignment, consistent radii/borders;
   nothing looks default-unstyled.

## Pass criteria
No layout breakage at any breakpoint; drawers/popovers behave; contrast passes;
findings filed for anything that looks unfinished.
