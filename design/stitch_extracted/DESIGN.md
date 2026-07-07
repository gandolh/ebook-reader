---
name: Quiet Paper
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#43474f'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#395f94'
  primary: '#30568b'
  on-primary: '#ffffff'
  primary-container: '#4a6fa5'
  on-primary-container: '#edf1ff'
  inverse-primary: '#a7c8ff'
  secondary: '#625e58'
  on-secondary: '#ffffff'
  secondary-container: '#e5dfd7'
  on-secondary-container: '#66625c'
  tertiary: '#705000'
  on-tertiary: '#ffffff'
  tertiary-container: '#8c6814'
  on-tertiary-container: '#fff0d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#1e477b'
  secondary-fixed: '#e8e1da'
  secondary-fixed-dim: '#ccc6be'
  on-secondary-fixed: '#1e1b17'
  on-secondary-fixed-variant: '#4a4641'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#edc065'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-title:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  body-reading:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  label-ui:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  reading-max-width: 680px
---

## Brand & Style
The brand personality is studious, serene, and tactile, aiming to replicate the immersive experience of physical reading. The design system targets a mature audience seeking a distraction-free environment for deep work and literature.

The style is a blend of **Minimalism** and **Tactile Modernism**. It prioritizes a high signal-to-noise ratio by utilizing generous whitespace, precise typography, and a "paper-first" material logic. Visual elements should feel like they are printed on or lightly resting upon a physical surface, avoiding aggressive digital effects in favor of subtle, organic depth.

## Colors
The palette is grounded in "Ink and Paper" fundamentals. The primary surfaces use a warm off-white to reduce eye strain, while the secondary sepia provides a softer, historical warmth.

- **Primary Blue (#4A6FA5):** Reserved for active states, progress indicators, and subtle highlights. It should feel like a faded ink stamp rather than a glowing digital button.
- **Ink (#1A1A1A):** Used for all primary text to ensure maximum contrast without the harshness of pure black.
- **Paper & Sepia:** These form the foundational layers of the UI, creating a sense of physical material.
- **Variants:** 
    - **Light:** Background #F9F7F2, Borders #E5E1D8.
    - **Sepia:** Background #F2EBE3, Borders #DED7CD.
    - **Dark:** Background #1A1A1A, Borders #2D2D2D, Text #E5E1D8 (Inversion).

## Typography
Typography is the core of this design system. We use a high-contrast serif for display and titles to evoke a literary feel, while a robust, legible serif handles the primary reading experience.

- **Headlines:** Use Playfair Display for book titles and section headers. Keep tracking tight on larger sizes.
- **Reading Body:** Source Serif 4 is the workhorse. Line height is intentionally generous (1.7x+) to prevent line-skipping and eye fatigue.
- **UI Labels:** Inter provides a functional contrast to the serif styles. Use it for navigation, buttons, and settings to signal "interface" versus "content."

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Navigation and interface elements use a standard grid, while the reading pane is strictly constrained to a maximum width of 680px to maintain optimal characters-per-line (CPL).

- **Margins:** Desktop margins are expansive to create a "gallery" feel for book covers.
- **Rhythm:** Use an 8px base grid for component layout, but a 4px grid for micro-adjustments in typography alignment.
- **Whitespace:** Elements should never feel crowded. If in doubt, increase padding by one scale unit (8px).

## Elevation & Depth
This design system avoids high-elevation shadows. Depth is communicated through **Tonal Layering** and **Subtle Scrims**.

- **Level 0 (Base):** The paper background.
- **Level 1 (Cards/Sheet):** A 1px border (#E5E1D8) with a very soft, diffused shadow (Offset: 0, 2px; Blur: 8px; Opacity: 0.04).
- **Modals:** Use a semi-transparent backdrop blur (12px) to keep the user grounded in their reading context while focusing on the settings or table of contents.

## Shapes
Shapes are **Soft (0.25rem)** to mimic the slightly rounded corners of a book cover or a stack of paper. Avoid perfectly sharp corners to maintain a "gentle" aesthetic, but do not use "pill" shapes for buttons, as they feel too "app-like" and modern for a literary context. 

- **Standard Elements:** 4px radius.
- **Book Covers:** 2px radius to maintain a structural, bound look.
- **Selection Highlights:** 2px radius or straight edges.

## Components
- **Buttons:** Primary buttons use a solid Ink (#1A1A1A) fill with Paper (#F9F7F2) text. Secondary buttons are outlined with 1px muted borders.
- **Chips:** Used for genres or tags. Use a secondary sepia background with no border and `label-caps` typography.
- **Lists:** Table of contents and library lists should have generous vertical padding (16px+) and thin hairline separators.
- **Input Fields:** Minimalist design. A single bottom border (1px) that thickens to 2px or changes to the Primary Blue accent on focus.
- **Cards (Book Covers):** Use a subtle bottom-heavy shadow to make the book appear as if it is standing on a shelf. 
- **Reading Progress:** A thin 2px horizontal bar using the Primary Blue accent, placed at the very top or bottom of the viewport to remain unobtrusive.